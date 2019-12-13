import { json2csv } from "json-2-csv";
import moment, { Moment } from "moment";
import React, { Fragment, ReactNode } from "react";
import { DateRangePicker, FocusedInputShape } from "react-dates";
import { RouteComponentProps, withRouter } from "react-router";
import "react-tabs/style/react-tabs.css";
import ClearSearchImg from "../assets/close.png";
import DownloadImg from "../assets/downloadcsv.png";
import SearchIcon from "../assets/search.png";
import Button from "../Components/Button";
import CheckBox from "../Components/CheckBox";
import LabelWrapper from "../Components/LabelWrapper";
import Notes from "../Components/Notes";
import TaskList from "../Components/TaskList";
import { SearchContext } from "../Components/TextItem";
import { ToolTipIcon } from "../Components/ToolTipIcon";
import {
  PaymentRecord,
  Pharmacy,
  RemoteConfig,
  Task,
  TaskChangeRecord,
  TaskState
} from "../sharedtypes";
import { ActionConfig, defaultConfig, TaskConfig } from "../store/config";
import {
  changeTaskState,
  getChanges,
  getNotes,
  getPharmacyDetails,
  getUserEmail,
  subscribeToTasks
} from "../store/corestore";
import { configuredComponent } from "../util/configuredComponent";
import debounce from "../util/debounce";
import { containsSearchTerm, DateRange, withinDateRange } from "../util/search";
import "./MainView.css";

export interface DetailsComponentProps {
  tasks: Task[];
  notesux: ReactNode;
  actionable?: boolean;
  registerActionCallback: (
    key: string,
    callback: () => Promise<ActionCallbackResult>
  ) => void;
  hideImagesDefault?: boolean;
  showPreviousClaims: boolean;
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
};

type State = {
  allTasks: Task[];
  pharmacies: { [name: string]: Pharmacy };
  tasks: Task[];
  changes: TaskChangeRecord[][];
  selectedTaskIndex: number;
  selectedTaskId?: string;
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
    changes: [],
    selectedTaskIndex: -1,
    initialSelectedTaskID: undefined,
    focusedInput: null,
    searchDates: { startDate: null, endDate: null },
    searchTermGlobal: "",
    showSearch: false,
    notes: "",
    disableOwnersFilter: false
  };
  _unsubscribe = () => {};
  _inputRef: React.RefObject<HTMLInputElement> = React.createRef();

  async componentDidMount() {
    this._unsubscribe = subscribeToTasks(
      this.props.taskState,
      this._onTasksChanged
    );
    this.props.registerForTabSelectCallback(this._onTabSelect);
    this.setState({
      cannedTaskNotes: await getNotes("task")
    });
  }

  componentWillUnmount() {
    this._unsubscribe();
  }

  _getSelectedTaskId() {}

  _onTasksChanged = async (tasks: Task[]) => {
    const changes = await Promise.all(tasks.map(t => getChanges(t.id)));
    let { notes, selectedTaskIndex, selectedTaskId } = this.state;

    if (tasks.length === 0) {
      selectedTaskIndex = -1;
      selectedTaskId = undefined;
      notes = "";
    } else {
      if (
        !!this.props.initialSelectedTaskID &&
        this.props.initialSelectedTaskID !== this.state.initialSelectedTaskID
      ) {
        selectedTaskId = this.props.initialSelectedTaskID;
        this.setState({
          initialSelectedTaskID: this.props.initialSelectedTaskID
        });
      }

      const groupedTasks = this._groupTasks(tasks);
      selectedTaskIndex = groupedTasks.findIndex(tasks =>
        tasks.some(task => task.id === selectedTaskId)
      );
      if (selectedTaskIndex === -1) {
        selectedTaskIndex = 0;
        selectedTaskId = tasks[0].id;
        notes = "";
      } else {
        if (selectedTaskIndex === -1) {
          selectedTaskIndex = Math.min(
            this.state.selectedTaskIndex,
            groupedTasks.length - 1
          );
          selectedTaskId = tasks[selectedTaskIndex].id;
          notes = "";
        }
      }
    }

    if (selectedTaskId !== this.state.selectedTaskId) {
      this._pushHistory(selectedTaskId);
    }
    this.setState(
      {
        allTasks: tasks,
        tasks,
        changes,
        selectedTaskIndex,
        selectedTaskId,
        notes
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
        index === -1
          ? undefined
          : groupTasksByPharmacy(this.state.tasks)[index][0].id;
      this.setState({
        selectedTaskIndex: index,
        selectedTaskId,
        notes: ""
      });
      this._pushHistory(selectedTaskId);
    }
    return result;
  };

  _renderTaskListItem = (tasks: Task[], isSelected: boolean) => {
    return <this.props.itemComponent tasks={tasks} isSelected={isSelected} />;
  };

  _onSearchClick = () => {
    const { notes, showSearch } = this.state;
    if (showSearch || this._okToSwitchAway()) {
      this.setState({
        showSearch: !showSearch,
        notes: showSearch ? notes : ""
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
    endDate
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
    return pharmacy.owners.includes(getUserEmail());
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
    const { selectedTaskIndex, tasks } = this.state;
    const pharmacyNames: { [name: string]: boolean } = {};
    tasks.forEach(task => (pharmacyNames[task.site.name] = true));
    const pharmacies: { [name: string]: Pharmacy } = {};
    await Promise.all(
      Object.keys(pharmacyNames).map(async siteName => {
        if (this.state.pharmacies.hasOwnProperty(siteName)) {
          return;
        }
        pharmacies[siteName] = await getPharmacyDetails(siteName);
      })
    );
    await new Promise(res =>
      this.setState(
        { pharmacies: { ...this.state.pharmacies, ...pharmacies } },
        res
      )
    );
    const selectedId =
      selectedTaskIndex >= 0 ? tasks[selectedTaskIndex].id : "";
    const filteredTasks = this._computeFilteredTasks(
      this.state.searchTermGlobal,
      this.state.searchDates
    );

    const changes = await Promise.all(filteredTasks.map(t => getChanges(t.id)));

    const selectedIndex = filteredTasks.findIndex(task => {
      return task.id === selectedId;
    });

    this.setState(
      {
        tasks: filteredTasks,
        selectedTaskIndex: selectedIndex,
        notes: "",
        changes
      },
      () => {
        if (selectedIndex === -1 && filteredTasks.length > 0) {
          this._onTaskSelect(0);
        }
      }
    );
  };

  _clearSearch = async () => {
    const { allTasks } = this.state;
    this._inputRef.current!.value = "";
    const changes = await Promise.all(allTasks.map(t => getChanges(t.id)));

    this.setState({
      searchDates: { startDate: null, endDate: null },
      tasks: allTasks,
      selectedTaskIndex: 0,
      searchTermGlobal: "",
      changes
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
            rejected: entry.rejected === undefined ? false : entry.rejected
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
        disableOwnersFilter: !state.disableOwnersFilter
      }),
      this._updateTasks
    );
  };

  _renderSearchPanel = () => {
    const { focusedInput, searchDates } = this.state;

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

          <Button
            className="mainview_clear_search_button"
            labelImg={DownloadImg}
            label={"Download CSV"}
            onClick={this._downloadCSV}
          />
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
    const { searchTermGlobal, selectedTaskIndex, notes } = this.state;
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
          searchTermGlobal: searchTermGlobal
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
          <div style={{ width: "100%" }}>
            {selectedTaskIndex >= 0 && (
              <ConfiguredDetailsWrapper
                hideImagesDefault={this.props.hideImagesDefault}
                showPreviousClaims={this.props.showPreviousClaims}
                tasks={this._groupTasks()[selectedTaskIndex]}
                notesux={notesux}
                notes={notes}
                detailsComponent={this.props.detailsComponent}
                actions={this.props.actions}
                key={this.state.tasks[selectedTaskIndex].id}
              />
            )}
          </div>
        </div>
      </SearchContext.Provider>
    );
  }
}

export default withRouter(TaskPanel);

interface DetailsWrapperProps {
  tasks: Task[];
  notes: string;
  notesux: ReactNode;
  detailsComponent: React.ComponentType<DetailsComponentProps>;
  actions: { [key: string]: ActionConfig };
  remoteConfig: Partial<RemoteConfig>;
  hideImagesDefault: boolean;
  showPreviousClaims: boolean;
}

interface DetailsWrapperState {
  buttonsBusy: { [key: string]: boolean };
}

export interface ActionCallbackResult {
  success: boolean;
  tasks?: Task[];
  payments?: PaymentRecord[];
}

class DetailsWrapper extends React.Component<
  DetailsWrapperProps,
  DetailsWrapperState
> {
  state: DetailsWrapperState = {
    buttonsBusy: {}
  };

  _actionCallbacks: {
    [key: string]: () => Promise<ActionCallbackResult>;
  } = [] as any;

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
        [key]: true
      }
    }));
    let tasks: Task[] = this.props.tasks;
    let result: ActionCallbackResult;
    if (this._actionCallbacks[key]) {
      result = await this._actionCallbacks[key]();
      this.setState(state => ({
        buttonsBusy: {
          ...state.buttonsBusy,
          [key]: false
        }
      }));
      tasks = result.tasks || tasks;
    }

    await Promise.all(
      tasks.map((task, index) =>
        changeTaskState(
          task,
          this.props.actions[key].nextTaskState,
          this.props.notes,
          result && result.payments ? result.payments[index] : undefined
        )
      )
    );
  };

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
        notesux={this.props.notesux}
        key={this.props.tasks[0].id}
        registerActionCallback={this._registerActionCallback}
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

function groupTasksByPharmacy(tasks: Task[]) {
  const tasksByPharmacy: { [pharmacyName: string]: Task[] } = {};
  tasks.forEach(task => {
    if (tasksByPharmacy[task.site.name]) {
      tasksByPharmacy[task.site.name].push(task);
    } else {
      tasksByPharmacy[task.site.name] = [task];
    }
  });
  return Object.values(tasksByPharmacy);
}
