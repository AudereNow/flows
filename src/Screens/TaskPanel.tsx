import "react-tabs/style/react-tabs.css";
import "./MainView.css";
import "react-confirm-alert/src/react-confirm-alert.css";

import {
  ActionConfig,
  DataStoreType,
  TaskConfig,
  defaultConfig,
} from "../store/config";
import { DateRange, containsSearchTerm, withinDateRange } from "../util/search";
import { DateRangePicker, FocusedInputShape } from "react-dates";
import {
  PaymentRecord,
  Pharmacy,
  RemoteConfig,
  Task,
  TaskChangeRecord,
  TaskState,
} from "../sharedtypes";
import React, { ChangeEvent, Fragment, ReactNode } from "react";
import { RouteComponentProps, withRouter } from "react-router";
import moment, { Moment } from "moment";

import Button from "../Components/Button";
import CheckBox from "../Components/CheckBox";
import ClearSearchImg from "../assets/close.png";
import DownloadImg from "../assets/downloadcsv.png";
import { Flag } from "../transport/baseDatastore";
import LabelWrapper from "../Components/LabelWrapper";
import Notes from "../Components/Notes";
import { SearchContext } from "../Components/TextItem";
import SearchIcon from "../assets/search.png";
import TaskList from "../Components/TaskList";
import { ToolTipIcon } from "../Components/ToolTipIcon";
import { configuredComponent } from "../util/configuredComponent";
import { confirmAlert } from "react-confirm-alert";
import { dataStore } from "../transport/datastore";
import debounce from "../util/debounce";
import { json2csv } from "json-2-csv";
import memoize from "memoize-one";

const SELECTED_ACTIONS_STORAGE_KEY = "selectedActions";

type SelectedActions = {
  [claimId: string]: ClaimActions;
};

export type ClaimActions = {
  action?: ClaimAction;
  flag: boolean;
};

export enum ClaimAction {
  APPROVE = "APPROVE",
  REJECT = "REJECT",
  HOLD = "HOLD",
}

export interface DetailsComponentProps {
  tasks: Task[];
  flags: { [taskId: string]: Flag[] };
  notesux: ReactNode;
  actionable?: boolean;
  registerActionCallback: (
    key: string,
    callback: () => Promise<ActionCallbackResult>
  ) => void;
  hideImagesDefault?: boolean;
  showPreviousClaims: boolean;
  updateSelectedAction: (
    taskId: string,
    action?: Partial<ClaimActions>
  ) => void;
  selectedActions: SelectedActions;
  taskConfig: TaskConfig;
}

type Props = RouteComponentProps & {
  config: TaskConfig;
  initialSelectedTaskID?: string;
  taskState: TaskState;
  listLabel: string;
  baseUrl: string;
  itemComponent: React.ComponentType<{ tasks: Task[]; isSelected: boolean }>;
  detailsComponent: React.ComponentType<DetailsComponentProps>;
  actions: { [key: string]: ActionConfig };
  registerForTabSelectCallback: (onTabSelect: () => boolean) => void;
  filterByOwners: boolean;
  hideImagesDefault: boolean;
  showPreviousClaims: boolean;
  taskConfig: TaskConfig;
};

type State = {
  allTasks: Task[];
  pharmacies: { [name: string]: Pharmacy };
  tasks: Task[];
  flags: { [taskId: string]: Flag[] };
  changes: TaskChangeRecord[][];
  selectedTaskIndex: number;
  initialSelectedTaskID?: string;
  focusedInput: FocusedInputShape | null;
  searchDates: DateRange;
  searchTermGlobal: string;
  showSearch: boolean;
  notes: string;
  disableOwnersFilter: boolean;
  cannedTaskNotes?: string[];
};

class TaskPanel extends React.Component<Props, State> {
  state: State = {
    allTasks: [],
    pharmacies: {},
    tasks: [],
    flags: {},
    changes: [],
    selectedTaskIndex: -1,
    initialSelectedTaskID: undefined,
    focusedInput: null,
    searchDates: { startDate: null, endDate: null },
    searchTermGlobal: "",
    showSearch: false,
    notes: "",
    disableOwnersFilter: false,
  };
  _unsubscribe = () => {};
  _inputRef: React.RefObject<HTMLInputElement> = React.createRef();

  async componentDidMount() {
    this._unsubscribe = dataStore.subscribeToTasks(
      this.props.taskState,
      this._onTasksChanged
    );
    this.props.registerForTabSelectCallback(this._onTabSelect);
    this.setState({
      cannedTaskNotes: await dataStore.getNotes("task"),
    });
  }

  componentWillUnmount() {
    this._unsubscribe();
  }

  _getSelectedTask() {
    const { selectedTaskId, selectedTaskIndex } = computeSelectedTaskId(
      this._groupTasks(),
      this.state.selectedTaskIndex,
      this.props.initialSelectedTaskID
    );
    if (selectedTaskId && this.props.initialSelectedTaskID !== selectedTaskId) {
      this._pushHistory(selectedTaskId);
    }
    if (this.state.selectedTaskIndex !== selectedTaskIndex) {
      this.setState({ selectedTaskIndex });
    }
    return { selectedTaskIndex, selectedTaskId };
  }

  _onTasksChanged = async (tasks: Task[]) => {
    const changes = await Promise.all(
      tasks.map(t => dataStore.getChanges(t.id))
    );
    let { notes, selectedTaskIndex } = this.state;

    const flags = await dataStore.loadFlags(tasks);
    const sortedTasks = tasks.sort((t1, t2) => {
      const v1 = flags[t1.id] ? -1 : 0;
      const v2 = flags[t2.id] ? -1 : 0;
      return v1 - v2;
    });

    this.setState(
      {
        allTasks: sortedTasks,
        tasks: sortedTasks,
        flags,
        changes,
        selectedTaskIndex,
        notes,
      },
      this._updateTasks
    );
  };

  _pushHistory(selectedTaskId?: string) {
    this.props.history.push(
      `/${this.props.baseUrl}${selectedTaskId ? "/" + selectedTaskId : ""}`
    );
  }

  _onTabSelect = (): boolean => {
    return this._okToSwitchAway();
  };

  _okToSwitchAway = (): boolean => {
    let result = true;
    if (this.state.notes.length > 0) {
      result = window.confirm(
        "You have some unsaved information for this item. OK to discard it?"
      );
    }
    return result;
  };

  _onTaskSelect = (index: number) => {
    const result = this._okToSwitchAway();
    if (result) {
      const selectedTaskId =
        index === -1 ? undefined : this._groupTasks()[index][0].id;
      this.setState({
        selectedTaskIndex: index,
        notes: "",
      });
      this._pushHistory(selectedTaskId);
    }
    return result;
  };

  _renderTaskListItem = (tasks: Task[], isSelected: boolean) => {
    const ItemComponent = this.props.itemComponent;
    return <ItemComponent tasks={tasks} isSelected={isSelected} />;
  };

  _onSearchClick = () => {
    const { notes, showSearch } = this.state;
    if (showSearch || this._okToSwitchAway()) {
      this.setState({
        showSearch: !showSearch,
        notes: showSearch ? notes : "",
      });
    }
  };

  _renderLabelItems = () => {
    const searchImg = this.state.showSearch ? ClearSearchImg : SearchIcon;
    return (
      <Fragment>
        <div className="labelwrapper_header_icon" onClick={this._onSearchClick}>
          <img
            className="labelwrapper_search_icon"
            src={searchImg}
            alt="labelwrapper_search_icon"
          />
        </div>
      </Fragment>
    );
  };

  _onFocusChange = (focusedInput: FocusedInputShape | null) => {
    this.setState({ focusedInput });
  };

  _onDatesChange = ({
    startDate,
    endDate,
  }: {
    startDate: Moment | null;
    endDate: Moment | null;
  }) => {
    this._handleSearchDatesChange({ startDate, endDate });
  };

  _onSearchTermChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let input = event.target.value;
    this._handleSearchTermGlobalChange(input);
  };

  _checkOwner = (siteName: string) => {
    if (!this.props.filterByOwners || this.state.disableOwnersFilter) {
      return true;
    }
    const pharmacy = this.state.pharmacies[siteName];
    if (!pharmacy || pharmacy.owners.length === 0) {
      return true;
    }
    return pharmacy.owners.includes(dataStore.getUserEmail());
  };

  _computeFilteredTasks = (searchTerm: string, dateRange: DateRange) => {
    let newTasks: any[] = [];

    this.state.allTasks.forEach(task => {
      if (this._checkOwner(task.site.name)) {
        let foundCount = 0;
        task.entries.forEach(entry => {
          (entry as any).pharmacy = task.site.name;
          if (
            withinDateRange(dateRange, entry) &&
            containsSearchTerm(searchTerm, entry) &&
            searchTerm.trim().length > 0
          ) {
            foundCount += 1;
          }
        });
        if (foundCount > 0 || searchTerm.trim().length === 0) {
          (task as any).foundCount = foundCount === 0 ? undefined : foundCount;
          newTasks.push(task);
        }
      }
    });
    return newTasks;
  };

  _handleSearchTermGlobalChange = debounce(async (searchTermGlobal: string) => {
    this.setState({ searchTermGlobal }, this._updateTasks);
  }, 500);

  _handleSearchDatesChange = async (searchDates: DateRange) => {
    this.setState({ searchDates }, this._updateTasks);
  };

  _updateTasks = async () => {
    const { tasks } = this.state;
    const pharmacyNames: { [name: string]: boolean } = {};
    tasks.forEach(task => (pharmacyNames[task.site.name] = true));
    const pharmacies: { [name: string]: Pharmacy } = {};
    await Promise.all(
      Object.keys(pharmacyNames).map(async siteName => {
        if (this.state.pharmacies.hasOwnProperty(siteName)) {
          return;
        }
        pharmacies[siteName] = await dataStore.getPharmacyDetails(siteName);
      })
    );
    await new Promise(res =>
      this.setState(
        { pharmacies: { ...this.state.pharmacies, ...pharmacies } },
        res
      )
    );
    const filteredTasks = this._computeFilteredTasks(
      this.state.searchTermGlobal,
      this.state.searchDates
    );

    const changes = await Promise.all(
      filteredTasks.map(t => dataStore.getChanges(t.id))
    );

    this.setState({
      tasks: filteredTasks,
      notes: "",
      changes,
    });
  };

  _clearSearch = async () => {
    const { allTasks } = this.state;
    this._inputRef.current!.value = "";
    const changes = await Promise.all(
      allTasks.map(t => dataStore.getChanges(t.id))
    );

    this.setState({
      searchDates: { startDate: null, endDate: null },
      tasks: allTasks,
      selectedTaskIndex: 0,
      searchTermGlobal: "",
      changes,
    });
  };

  _getDownloadFilename = () => {
    let currentTab = "unknown";
    const { tabs } = defaultConfig;
    for (const tab in tabs) {
      if (this.props.taskState === (tabs[tab] as TaskConfig).taskState) {
        currentTab = tab;
        break;
      }
    }
    const timestamp = moment().format("YYYYMMDD_HHmmss");
    return `${currentTab}_${timestamp}`;
  };

  _downloadCSV = () => {
    const { tasks } = this.state;

    if (tasks.length === 0) {
      alert("There are no tasks to download! Please adjust your search.");
    }
    const fileName = this._getDownloadFilename();
    let rows: any[] = [];
    const json2csvOptions = { checkSchemaDifferences: false };
    tasks.forEach(task => {
      task.entries.forEach(entry => {
        let entryCopy = Object.assign(
          {
            id: task.id,
            siteName: task.site.name,
            notes: entry.notes || "",
            pharmacy: task.site.name || "",
            rejected: entry.rejected === undefined ? false : entry.rejected,
          },
          entry
        );
        delete (entryCopy as any)["originalIndex"];
        rows.push(entryCopy);
      });
    });

    json2csv(
      rows,
      (err, csv) => {
        if (!csv || err) {
          alert("Something went wrong when trying to download your csv");
        }

        const dataString = "data:text/csv;charset=utf-8," + csv;
        const encodedURI = encodeURI(dataString);
        const link = document.createElement("a");
        link.setAttribute("href", encodedURI);
        link.setAttribute("download", `${fileName}.csv`);
        link.click();
      },
      json2csvOptions
    );
  };

  _onOwnersFilterToggle = () => {
    this.setState(
      state => ({
        disableOwnersFilter: !state.disableOwnersFilter,
      }),
      this._updateTasks
    );
  };

  _renderSearchPanel = () => {
    const { focusedInput, searchDates } = this.state;
    const showDownloadCSV =
      defaultConfig.dataStore.type === DataStoreType.FIREBASE;

    return (
      <div
        className={`mainview_search_container ${
          !!this.state.showSearch ? "" : "mainview_hide_search"
        }`}
      >
        <div className="labelwrapper_row">
          {this.props.filterByOwners && (
            <CheckBox
              checked={this.state.disableOwnersFilter}
              onCheckBoxSelect={this._onOwnersFilterToggle}
              value={"disableOwnersFilter"}
              label={"Show tasks owned by teammates"}
            />
          )}
        </div>
        <div>
          <div className="mainview_search_row">
            <input
              className="mainview_search_input"
              ref={this._inputRef}
              type="text"
              onChange={this._onSearchTermChange}
              placeholder="Search by keyword(s)"
            />
            <ToolTipIcon
              label={"ⓘ"}
              iconClassName="tooltipicon_information"
              tooltip={
                "Available search keys: 'patient', 'pharmacy', 'item'. Example query: item:e, patient:ru"
              }
            />
          </div>
          <div className="mainview_search_row">
            <div className="mainview_padded_row">Date Range: </div>
            <div className="mainview_date_picker">
              <DateRangePicker
                startDate={searchDates.startDate}
                startDateId={"startDate"}
                endDate={searchDates.endDate}
                endDateId={"endDate"}
                onDatesChange={this._onDatesChange}
                focusedInput={focusedInput}
                onFocusChange={this._onFocusChange}
                isOutsideRange={() => false}
                small={true}
                block={true}
              />
            </div>
          </div>
        </div>
        <div className="mainview_spaced_row">
          <Button
            className="mainview_clear_search_button"
            label="Clear Search"
            labelImg={ClearSearchImg}
            onClick={this._clearSearch}
          />

          {showDownloadCSV && (
            <Button
              className="mainview_clear_search_button"
              labelImg={DownloadImg}
              label={"Download CSV"}
              onClick={this._downloadCSV}
            />
          )}
        </div>
      </div>
    );
  };

  _onNotesChanged = (notes: string) => {
    this.setState({ notes });
  };

  _groupTasks = (tasks: Task[] = this.state.tasks) => {
    if (this.props.config.groupTasksByPharmacy) {
      return groupTasksByPharmacy(tasks);
    } else {
      return tasks.map(task => [task]);
    }
  };

  render() {
    const { searchTermGlobal, notes } = this.state;
    const { selectedTaskIndex } = this._getSelectedTask();
    const actionable = Object.keys(this.props.actions).length > 0;
    const notesux =
      selectedTaskIndex >= 0 ? (
        <Notes
          changes={this.state.changes[selectedTaskIndex]}
          actionable={actionable}
          notes={notes}
          onNotesChanged={this._onNotesChanged}
          cannedNotes={this.state.cannedTaskNotes}
        />
      ) : null;
    return (
      <SearchContext.Provider
        value={{
          searchTermGlobal: searchTermGlobal,
        }}
      >
        <div className="mainview_content">
          <LabelWrapper
            label={`${this.props.listLabel}:`}
            postLabelElement={
              <span className="mainview_text_primary">{`(${this.state.tasks.length})`}</span>
            }
            renderLabelItems={this._renderLabelItems}
            searchPanel={this._renderSearchPanel()}
          >
            <TaskList
              onSelect={this._onTaskSelect}
              tasks={this._groupTasks()}
              renderItem={this._renderTaskListItem}
              selectedItem={selectedTaskIndex}
              className="mainview_tasklist"
            />
          </LabelWrapper>
          {selectedTaskIndex >= 0 && (
            <ConfiguredDetailsWrapper
              hideImagesDefault={this.props.hideImagesDefault}
              showPreviousClaims={this.props.showPreviousClaims}
              tasks={this._groupTasks()[selectedTaskIndex]}
              flags={this.state.flags}
              notesux={notesux}
              notes={notes}
              detailsComponent={this.props.detailsComponent}
              actions={this.props.actions}
              key={this.state.tasks[selectedTaskIndex].id}
              taskConfig={this.props.taskConfig}
            />
          )}
        </div>
      </SearchContext.Provider>
    );
  }
}

export default withRouter(TaskPanel);

interface DetailsWrapperProps {
  tasks: Task[];
  flags: { [taskId: string]: Flag[] };
  notes: string;
  notesux: ReactNode;
  detailsComponent: React.ComponentType<DetailsComponentProps>;
  actions: { [key: string]: ActionConfig };
  remoteConfig: Partial<RemoteConfig>;
  hideImagesDefault: boolean;
  showPreviousClaims: boolean;
  taskConfig: TaskConfig;
}

interface DetailsWrapperState {
  buttonsBusy: { [key: string]: boolean };
  selectedActions: SelectedActions;
}

export interface ActionCallbackResult {
  success: boolean;
  payments?: PaymentRecord[];
}

class DetailsWrapper extends React.Component<
  DetailsWrapperProps,
  DetailsWrapperState
> {
  state: DetailsWrapperState = {
    buttonsBusy: {},
    selectedActions: getSavedSelectedActions(this.props.taskConfig.taskState),
  };

  _actionCallbacks: {
    [key: string]: () => Promise<ActionCallbackResult>;
  } = [] as any;

  _updateSelectedAction = (taskId: string, action?: Partial<ClaimActions>) => {
    this.setState(state => {
      const { selectedActions } = this.state;
      const newActions = { ...selectedActions };
      const oldAction = newActions[taskId] || { flag: false };
      const newAction = Object.assign({}, oldAction, action);
      newActions[taskId] = newAction;
      saveSelectedActions(this.props.taskConfig.taskState, newActions);
      return {
        selectedActions: newActions,
      };
    });
  };

  _registerActionCallback = (
    key: string,
    callback: () => Promise<ActionCallbackResult>
  ) => {
    this._actionCallbacks[key] = callback;
  };

  _onActionClick = async (key: string) => {
    this.setState(state => ({
      buttonsBusy: {
        ...state.buttonsBusy,
        [key]: true,
      },
    }));
    await this._performActions(key);
    this.setState(state => ({
      buttonsBusy: {
        ...state.buttonsBusy,
        [key]: false,
      },
    }));
  };

  _countActions = () => {
    return this.props.tasks.reduce(
      (stats, task) => {
        const action =
          this.state.selectedActions[task.id]?.action || "unreviewed";
        return {
          ...stats,
          [action]: stats[action] + 1,
        };
      },
      {
        [ClaimAction.APPROVE]: 0,
        [ClaimAction.REJECT]: 0,
        [ClaimAction.HOLD]: 0,
        unreviewed: 0,
      }
    );
  };

  _performActions = async (key: string) => {
    const tasks: Task[] = this.props.tasks;
    const action = this.props.actions[key];
    const stats = this._countActions();
    const additionalReviewsNeeded =
      Math.ceil(tasks.length * this.props.taskConfig.manualReviewMinimumRatio) -
      stats[ClaimAction.APPROVE];
    if (
      action.claimAction === ClaimAction.APPROVE &&
      additionalReviewsNeeded > 0
    ) {
      const approveBelowThreshold = await new Promise(res =>
        confirmAlert({
          title: `${additionalReviewsNeeded} more approvals needed`,
          message:
            "You have manually reviewed fewer than 20% of the claims for this facility, are you sure you want to continue?",
          buttons: [
            {
              label: "Yes",
              onClick: () => res(true),
            },
            {
              label: "No",
              onClick: () => res(false),
            },
          ],
        })
      );
      if (!approveBelowThreshold) {
        return;
      }
    }
    if (action.claimAction === ClaimAction.REJECT) {
      const confirmReject = await new Promise(res =>
        confirmAlert({
          customUI: ({ onClose }) => (
            <RejectAllDialog
              confirm={value => {
                res(value);
                onClose();
              }}
            />
          ),
          buttons: [
            {
              label: "Yes",
              onClick: () => res(true),
            },
            {
              label: "No",
              onClick: () => res(false),
            },
          ],
        })
      );
      if (!confirmReject) {
        return;
      }
    }
    let approvedTasks = tasks.filter(
      task =>
        this.state.selectedActions[task.id]?.action === ClaimAction.APPROVE
    );
    let rejectedTasks = tasks.filter(
      task => this.state.selectedActions[task.id]?.action === ClaimAction.REJECT
    );
    let flaggedTasks = tasks.filter(
      task => this.state.selectedActions[task.id]?.flag
    );
    let unreviewedTasks = tasks.filter(
      task => this.state.selectedActions[task.id]?.action === undefined
    );

    let result: ActionCallbackResult | undefined = undefined;
    if (this._actionCallbacks[key]) {
      result = await this._actionCallbacks[key]();
      if (!result.success) {
        return;
      }
    }

    const approveAction = Object.values(this.props.actions).find(
      action => action.claimAction === ClaimAction.APPROVE
    );
    const rejectAction = Object.values(this.props.actions).find(
      action => action.claimAction === ClaimAction.REJECT
    );

    if (!approveAction || !rejectAction) {
      throw new Error("Missing action config");
    }

    await this.performAction(
      action.claimAction,
      approveAction,
      approvedTasks,
      unreviewedTasks,
      flaggedTasks,
      result && result.payments && result.payments[0]
    );
    await this.performAction(
      action.claimAction,
      rejectAction,
      rejectedTasks,
      unreviewedTasks,
      flaggedTasks
    );
  };

  async performAction(
    selectedClaimAction: ClaimAction,
    action: ActionConfig,
    reviewedTasks: Task[],
    unreviewedTasks: Task[],
    flaggedTasks: Task[],
    payment?: PaymentRecord
  ) {
    let tasks = [...reviewedTasks];
    if (action.claimAction === selectedClaimAction) {
      tasks.push(...unreviewedTasks);
    }
    await dataStore.changeTaskState(
      tasks,
      reviewedTasks,
      selectedClaimAction === ClaimAction.APPROVE ? flaggedTasks : [],
      action.nextTaskState,
      this.props.notes,
      payment
    );
  }

  render() {
    const buttons = Object.entries(this.props.actions).filter(
      ([key, action]) => {
        if (action.disableOnConfig) {
          return !(this.props.remoteConfig as any)[action.disableOnConfig];
        }
        if (action.enableOnConfig) {
          return (this.props.remoteConfig as any)[action.enableOnConfig];
        }
        return true;
      }
    );
    return (
      <this.props.detailsComponent
        hideImagesDefault={this.props.hideImagesDefault}
        showPreviousClaims={this.props.showPreviousClaims}
        tasks={this.props.tasks}
        flags={this.props.flags}
        notesux={this.props.notesux}
        key={this.props.tasks[0].id}
        registerActionCallback={this._registerActionCallback}
        taskConfig={this.props.taskConfig}
        updateSelectedAction={this._updateSelectedAction}
        selectedActions={this.state.selectedActions}
      >
        <div className="mainview_button_row">
          {buttons.map(([key, actionConfig]) => (
            <Button
              className={actionConfig.labelClassName}
              disabled={this.state.buttonsBusy[key]}
              label={actionConfig.label}
              labelImg={actionConfig.labelImg}
              onClick={this._onActionClick}
              callbackKey={key}
              key={key}
            />
          ))}
        </div>
      </this.props.detailsComponent>
    );
  }
}

const ConfiguredDetailsWrapper = configuredComponent<
  Omit<DetailsWrapperProps, "remoteConfig">,
  { remoteConfig: Partial<RemoteConfig> }
>(DetailsWrapper, (config, props) => {
  const configProps: Partial<RemoteConfig> = {};
  Object.values(props.actions)
    .map(action => action.disableOnConfig || action.enableOnConfig)
    .forEach(configName => {
      if (configName) {
        (configProps as any)[configName] = (config as any)[configName];
      }
    });
  return { remoteConfig: configProps };
});

const groupTasksByPharmacy = memoize((tasks: Task[]) => {
  const tasksByPharmacy: { [pharmacyName: string]: Task[] } = {};
  tasks.forEach(task => {
    if (tasksByPharmacy[task.site.name]) {
      tasksByPharmacy[task.site.name].push(task);
    } else {
      tasksByPharmacy[task.site.name] = [task];
    }
  });
  return Object.values(tasksByPharmacy);
});

const computeSelectedTaskId = memoize(
  (
    groupedTasks: Task[][],
    selectedTaskIndex: number,
    selectedTaskId?: string
  ) => {
    let newSelectedTaskIndex;
    if (groupedTasks.length === 0) {
      newSelectedTaskIndex = -1;
      selectedTaskId = undefined;
    } else {
      newSelectedTaskIndex = groupedTasks.findIndex(tasks =>
        tasks.some(task => task.id === selectedTaskId)
      );
      if (newSelectedTaskIndex === -1) {
        newSelectedTaskIndex = Math.min(
          Math.max(0, selectedTaskIndex),
          groupedTasks.length - 1
        );
        selectedTaskId = groupedTasks[newSelectedTaskIndex][0].id;
      }
    }
    return { selectedTaskIndex: newSelectedTaskIndex, selectedTaskId };
  }
);

function getSelectedActionsStorageKey(taskState: TaskState) {
  return `${SELECTED_ACTIONS_STORAGE_KEY}_${taskState}`;
}

function getSavedSelectedActions(taskState: TaskState): SelectedActions {
  const actionsString = localStorage.getItem(
    getSelectedActionsStorageKey(taskState)
  );
  if (!actionsString) {
    return {};
  }
  return JSON.parse(actionsString);
}

function saveSelectedActions(
  taskState: TaskState,
  selectedActions: SelectedActions
) {
  localStorage.setItem(
    getSelectedActionsStorageKey(taskState),
    JSON.stringify(selectedActions)
  );
}

interface RejectAllDialogProps {
  confirm: (value: boolean) => void;
}
interface RejectAllDialogState {
  textboxValue: string;
  showValidation: boolean;
}
class RejectAllDialog extends React.Component<
  RejectAllDialogProps,
  RejectAllDialogState
> {
  state: RejectAllDialogState = {
    textboxValue: "",
    showValidation: false,
  };

  _updateTextboxValue = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      textboxValue: e.target.value,
    });
  };

  render() {
    const { confirm } = this.props;
    const { textboxValue, showValidation } = this.state;
    return (
      <div className="react-confirm-alert-body">
        <h1>Are you sure you want to reject all of these claims?</h1>
        <p>
          This will reject every unreviewed claim in the batch, are you sure you
          want to continue?
        </p>
        <div>
          Type "Reject All" to confirm:{" "}
          <input
            type="text"
            value={textboxValue}
            onChange={this._updateTextboxValue}
          ></input>
          {showValidation && (
            <div style={{ color: "red" }}>
              Fill out the textbox above to continue
            </div>
          )}
        </div>
        <div className="react-confirm-alert-button-group">
          <button
            onClick={() => {
              if (textboxValue.toLowerCase() === "reject all") {
                confirm(true);
              } else {
                this.setState({ showValidation: true });
              }
            }}
          >
            Reject All
          </button>
          <button
            onClick={() => {
              confirm(false);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }
}
