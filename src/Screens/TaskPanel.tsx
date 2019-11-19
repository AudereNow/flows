import { json2csv } from "json-2-csv";
import moment, { Moment } from "moment";
import React, { Fragment, ReactNode } from "react";
import { DateRangePicker, FocusedInputShape } from "react-dates";
import { RouteComponentProps, withRouter } from "react-router";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import CheckBox from "../Components/CheckBox";
import LabelWrapper from "../Components/LabelWrapper";
import Notes from "../Components/Notes";
import TaskList from "../Components/TaskList";
import { SearchContext } from "../Components/TextItem";
import {
  RemoteConfig,
  Task,
  TaskChangeRecord,
  TaskState
} from "../sharedtypes";
import { ActionConfig, defaultConfig, TaskConfig } from "../store/config";
import {
  changeTaskState,
  getChanges,
  subscribeToTasks
} from "../store/corestore";
import { configuredComponent } from "../util/configuredComponent";
import debounce from "../util/debounce";
import { containsSearchTerm, DateRange, withinDateRange } from "../util/search";
import "./MainView.css";

export interface DetailsComponentProps {
  task: Task;
  notesux: ReactNode;
  actionable?: boolean;
  registerActionCallback: (
    key: string,
    callback: () => Promise<ActionCallbackResult>
  ) => void;
}

export interface SiteFilters {
  name?: boolean;
}

export interface ChangeRowFilters {
  taskID?: boolean;
  timestamp?: boolean;
  description?: boolean;
  notes?: boolean;
}

export interface ClaimEntryFilters {
  patient?: boolean;
  name?: boolean;
  patientID?: boolean;
  item?: boolean;
}

type Props = RouteComponentProps & {
  initialSelectedTaskID?: string;
  taskState: TaskState;
  listLabel: string;
  baseUrl: string;
  itemComponent: React.ComponentType<{ task: Task; isSelected: boolean }>;
  detailsComponent: React.ComponentType<DetailsComponentProps>;
  actions: { [key: string]: ActionConfig };
  registerForTabSelectCallback: (onTabSelect: () => boolean) => void;
};

type State = {
  allTasks: Task[];
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
  filters: ClaimEntryFilters;
};

class TaskPanel extends React.Component<Props, State> {
  state: State = {
    allTasks: [],
    tasks: [],
    changes: [],
    selectedTaskIndex: -1,
    initialSelectedTaskID: undefined,
    focusedInput: null,
    searchDates: { startDate: null, endDate: null },
    searchTermGlobal: "",
    showSearch: false,
    notes: "",
    filters: { patient: false, name: false, patientID: false, item: false }
  };
  _unsubscribe = () => {};
  _inputRef: React.RefObject<HTMLInputElement> = React.createRef();

  async componentDidMount() {
    this._unsubscribe = subscribeToTasks(
      this.props.taskState,
      this._onTasksChanged
    );
    this.props.registerForTabSelectCallback(this._onTabSelect);
  }

  componentWillUnmount() {
    this._unsubscribe();
  }

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

      selectedTaskIndex = tasks.findIndex(task => task.id === selectedTaskId);
      if (selectedTaskIndex === -1) {
        selectedTaskIndex = 0;
        selectedTaskId = tasks[0].id;
        notes = "";
      } else {
        if (selectedTaskIndex === -1) {
          selectedTaskIndex = Math.min(
            this.state.selectedTaskIndex,
            tasks.length - 1
          );
          selectedTaskId = tasks[selectedTaskIndex].id;
          notes = "";
        }
      }
    }

    if (selectedTaskId !== this.state.selectedTaskId) {
      this._pushHistory(selectedTaskId);
    }

    this.setState({
      allTasks: tasks,
      tasks,
      changes,
      selectedTaskIndex,
      selectedTaskId,
      notes
    });
  };

  _pushHistory(selectedTaskId?: string) {
    this.props.history.push(
      `${this.props.baseUrl}${selectedTaskId ? "/" + selectedTaskId : ""}`
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
        index === -1 ? undefined : this.state.tasks[index].id;
      this.setState({
        selectedTaskIndex: index,
        selectedTaskId,
        notes: ""
      });
      this._pushHistory(selectedTaskId);
    }
    return result;
  };

  _renderTaskListItem = (task: Task, isSelected: boolean) => {
    return <this.props.itemComponent task={task} isSelected={isSelected} />;
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
    return (
      <Fragment>
        <div className="labelwrapper_header_icon" onClick={this._onSearchClick}>
          &nbsp;&#x1F50E;
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

  _computeFilteredTasks = (searchTerm: string, dateRange: DateRange) => {
    const { filters } = this.state;

    return this.state.allTasks.filter(task => {
      return (
        (containsSearchTerm(searchTerm, task.site, filters) ||
          task.entries.some(entry => {
            return containsSearchTerm(searchTerm, entry, filters);
          })) &&
        task.entries.some(entry => {
          return withinDateRange(dateRange, entry);
        })
      );
    });
  };

  _handleSearchTermGlobalChange = debounce(async (searchTerm: string) => {
    const { selectedTaskIndex, tasks } = this.state;
    const selectedId =
      selectedTaskIndex >= 0 ? tasks[selectedTaskIndex].id : "";
    const filteredTasks = this._computeFilteredTasks(
      searchTerm,
      this.state.searchDates
    );

    const changes = await Promise.all(filteredTasks.map(t => getChanges(t.id)));

    const selectedIndex = filteredTasks.findIndex(task => {
      return task.id === selectedId;
    });
    this.setState(
      {
        tasks: filteredTasks,
        searchTermGlobal: searchTerm,
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
  }, 500);

  _handleSearchDatesChange = async (searchDates: DateRange) => {
    const { selectedTaskIndex, tasks } = this.state;
    const selectedId =
      selectedTaskIndex >= 0 ? tasks[selectedTaskIndex].id : "";
    const filteredTasks = this._computeFilteredTasks(
      this.state.searchTermGlobal,
      searchDates
    );

    const changes = await Promise.all(filteredTasks.map(t => getChanges(t.id)));

    const selectedIndex = filteredTasks.findIndex(task => {
      return task.id === selectedId;
    });

    this.setState({
      searchDates,
      tasks: filteredTasks,
      selectedTaskIndex: selectedIndex,
      notes: "",
      changes
    });
  };

  _clearSearch = async () => {
    const { allTasks } = this.state;
    this._inputRef.current!.value = "";
    const changes = await Promise.all(allTasks.map(t => getChanges(t.id)));

    this.setState({
      searchDates: { startDate: null, endDate: null },
      tasks: allTasks,
      filters: { patient: false, name: false, patientID: false, item: false },
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
          { id: task.id, siteName: task.site.name },
          entry
        );

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

  _onCheckBoxSelect = (event: React.MouseEvent<HTMLDivElement>) => {
    const name = event.currentTarget.attributes.getNamedItem("data-value")!
      .value;

    let filters = this.state.filters;
    (filters as any)[name] = !(filters as any)[name];
    this.setState({ filters }, () => {
      this._handleSearchTermGlobalChange(this.state.searchTermGlobal);
    });
  };

  _renderSearchPanel = () => {
    const { focusedInput, searchDates } = this.state;
    const patientKeyMap: any = {
      patient: "Patient",
      patientID: "ID",
      name: "Pharmacy",
      item: "Item"
    };

    return (
      <div
        className={`mainview_search_container ${
          !!this.state.showSearch ? "" : "mainview_hide_search"
        }`}
      >
        <div className="labelwrapper_row">
          <div className="mainview_search_row">
            <input
              className="mainview_search_input"
              ref={this._inputRef}
              type="text"
              onChange={this._onSearchTermChange}
              placeholder="Search"
            />
            <Button
              className="mainview_clear_search_button"
              label="Clear Search"
              onClick={this._clearSearch}
            />
          </div>
          <div className="mainview_spaced_row">
            {Object.keys(patientKeyMap).map((key, index) => {
              return (
                <CheckBox
                  key={key + index}
                  checked={(this.state.filters as any)[key] || false}
                  onCheckBoxSelect={this._onCheckBoxSelect}
                  value={key}
                  label={patientKeyMap[key]}
                />
              );
            })}
          </div>
          <div className="mainview_spaced_row">
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
            <Button label={"Download CSV"} onClick={this._downloadCSV} />
          </div>
        </div>
      </div>
    );
  };

  _onNotesChanged = (notes: string) => {
    this.setState({ notes });
  };

  render() {
    const { selectedTaskIndex, notes } = this.state;
    const actionable = Object.keys(this.props.actions).length > 0;
    const notesux =
      selectedTaskIndex >= 0 ? (
        <Notes
          changes={this.state.changes[selectedTaskIndex]}
          actionable={actionable}
          notes={notes}
          onNotesChanged={this._onNotesChanged}
        />
      ) : null;

    return (
      <SearchContext.Provider
        value={{
          searchTermGlobal: this.state.searchTermGlobal,
          filters: this.state.filters
        }}
      >
        <div className="mainview_content">
          <LabelWrapper
            label={`${this.props.listLabel}: ${this.state.tasks.length}`}
            renderLabelItems={this._renderLabelItems}
            searchPanel={this._renderSearchPanel()}
          >
            <TaskList
              onSelect={this._onTaskSelect}
              tasks={this.state.tasks}
              renderItem={this._renderTaskListItem}
              selectedItem={selectedTaskIndex}
              className="mainview_tasklist"
            />
          </LabelWrapper>
          <div style={{ width: "100%" }}>
            {selectedTaskIndex >= 0 && (
              <ConfiguredDetailsWrapper
                task={this.state.tasks[selectedTaskIndex]}
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
  task: Task;
  notes: string;
  notesux: ReactNode;
  detailsComponent: React.ComponentType<DetailsComponentProps>;
  actions: { [key: string]: ActionConfig };
  remoteConfig: Partial<RemoteConfig>;
}

interface DetailsWrapperState {
  buttonsBusy: { [key: string]: boolean };
}

interface ActionCallbackResult {
  success: boolean;
  task?: Task;
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
    let task: Task = this.props.task;
    if (this._actionCallbacks[key]) {
      const result = await this._actionCallbacks[key]();
      if (!result.success) {
        this.setState(state => ({
          buttonsBusy: {
            ...state.buttonsBusy,
            [key]: false
          }
        }));
        return;
      }
      task = result.task || task;
    }
    await changeTaskState(
      task,
      this.props.actions[key].nextTaskState,
      this.props.notes
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
        task={this.props.task}
        notesux={this.props.notesux}
        key={this.props.task.id}
        registerActionCallback={this._registerActionCallback}
      >
        <div className="mainview_button_row">
          {buttons.map(([key, actionConfig]) => (
            <Button
              disabled={this.state.buttonsBusy[key]}
              label={actionConfig.label}
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
