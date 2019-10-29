import { json2csv } from "json-2-csv";
import moment, { Moment } from "moment";
import React, { Fragment, ReactNode } from "react";
import { DateRangePicker, FocusedInputShape } from "react-dates";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import LabelWrapper from "../Components/LabelWrapper";
import Notes from "../Components/Notes";
import TaskList from "../Components/TaskList";
import { Task, TaskState, TaskChangeRecord } from "../sharedtypes";
import {
  changeTaskState,
  subscribeToTasks,
  getChanges
} from "../store/corestore";
import { ActionConfig } from "../store/config";
import debounce from "../util/debounce";
import { containsSearchTerm, DateRange, withinDateRange } from "../util/search";
import { TaskConfig, defaultConfig } from "../store/config";
import "./MainView.css";

export interface DetailsComponentProps {
  task: Task;
  notesux: ReactNode;
  notes: string;
  actionable?: boolean;
  registerActionCallback: (
    key: string,
    callback: () => Promise<ActionCallbackResult>
  ) => void;
}

type Props = {
  taskState: TaskState;
  listLabel: string;
  itemComponent: React.ComponentClass<{ task: Task; isSelected: boolean }>;
  detailsComponent: React.ComponentClass<DetailsComponentProps>;
  actions: { [key: string]: ActionConfig };
};

type State = {
  allTasks: Task[];
  tasks: Task[];
  changes: TaskChangeRecord[][];
  selectedTaskIndex: number;
  selectedTaskId?: string;
  focusedInput: FocusedInputShape | null;
  searchDates: DateRange;
  searchTermGlobal: string;
  showSearch: boolean;
  notes: string;
};

export default class TaskPanel extends React.Component<Props, State> {
  state: State = {
    allTasks: [],
    tasks: [],
    changes: [],
    selectedTaskIndex: -1,
    focusedInput: null,
    searchDates: { startDate: null, endDate: null },
    searchTermGlobal: "",
    showSearch: false,
    notes: ""
  };
  _unsubscribe = () => {};
  _inputRef: React.RefObject<HTMLInputElement> = React.createRef();

  async componentDidMount() {
    this._unsubscribe = subscribeToTasks(
      this.props.taskState,
      this._onTasksChanged
    );
  }

  componentWillUnmount() {
    this._unsubscribe();
  }

  _onTasksChanged = async (tasks: Task[]) => {
    const changes = await Promise.all(tasks.map(t => getChanges(t.id)));
    let { selectedTaskIndex, selectedTaskId } = this.state;

    if (tasks.length === 0) {
      selectedTaskIndex = -1;
      selectedTaskId = undefined;
    } else {
      if (selectedTaskIndex === -1) {
        selectedTaskIndex = 0;
        selectedTaskId = tasks[0].id;
      } else {
        selectedTaskIndex = tasks.findIndex(task => task.id === selectedTaskId);
        if (selectedTaskIndex === -1) {
          selectedTaskIndex = Math.min(
            this.state.selectedTaskIndex,
            tasks.length - 1
          );
          selectedTaskId = tasks[selectedTaskIndex].id;
        }
      }
    }

    this.setState({
      allTasks: tasks,
      tasks,
      changes,
      selectedTaskIndex,
      selectedTaskId
    });
  };

  _onTaskSelect = (index: number) => {
    let result = true;
    if (this.state.notes.length > 0) {
      result = window.confirm(
        "You have some unsaved information for this item. OK to discard it?"
      );
    }
    if (result) {
      this.setState({
        selectedTaskIndex: index,
        selectedTaskId: index === -1 ? undefined : this.state.tasks[index].id,
        notes: ""
      });
    }
    return result;
  };

  _renderTaskListItem = (task: Task, isSelected: boolean) => {
    return <this.props.itemComponent task={task} isSelected={isSelected} />;
  };

  _onSearchClick = () => {
    this.setState({ showSearch: !this.state.showSearch });
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
    return this.state.allTasks.filter(task => {
      return (
        (containsSearchTerm(searchTerm, task.site) ||
          task.entries.some(entry => {
            return containsSearchTerm(searchTerm, entry);
          })) &&
        task.entries.some(entry => {
          return withinDateRange(dateRange, entry);
        })
      );
    });
  };

  _handleSearchTermGlobalChange = debounce((searchTerm: string) => {
    const { selectedTaskIndex, tasks } = this.state;
    const selectedId =
      selectedTaskIndex >= 0 ? tasks[selectedTaskIndex].id : "";
    const filteredTasks = this._computeFilteredTasks(
      searchTerm,
      this.state.searchDates
    );
    const selectedIndex = filteredTasks.findIndex(task => {
      return task.id === selectedId;
    });
    this.setState(
      {
        tasks: filteredTasks,
        searchTermGlobal: searchTerm,
        selectedTaskIndex: selectedIndex
      },
      () => {
        if (selectedIndex === -1 && filteredTasks.length > 0) {
          this._onTaskSelect(0);
        }
      }
    );
  }, 500);

  _handleSearchDatesChange = (searchDates: DateRange) => {
    const { selectedTaskIndex, tasks } = this.state;
    const selectedId =
      selectedTaskIndex >= 0 ? tasks[selectedTaskIndex].id : "";
    const filteredTasks = this._computeFilteredTasks(
      this.state.searchTermGlobal,
      searchDates
    );
    const selectedIndex = filteredTasks.findIndex(task => {
      return task.id === selectedId;
    });

    this.setState({
      searchDates,
      tasks: filteredTasks,
      selectedTaskIndex: selectedIndex
    });
  };

  _clearSearch = () => {
    const { allTasks } = this.state;
    this._inputRef.current!.value = "";
    this.setState({
      searchDates: { startDate: null, endDate: null },
      tasks: allTasks
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

  _renderSearchPanel = () => {
    const { focusedInput, searchDates } = this.state;
    return (
      <div className="mainview_search_container">
        <DateRangePicker
          startDate={searchDates.startDate}
          startDateId={"startDate"}
          endDate={searchDates.endDate}
          endDateId={"endDate"}
          onDatesChange={this._onDatesChange}
          focusedInput={focusedInput}
          onFocusChange={this._onFocusChange}
          isOutsideRange={() => false}
          regular={true}
        />
        <div className="labelwrapper_row">
          <input
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
          <Button label={"Download CSV"} onClick={this._downloadCSV} />
        </div>
      </div>
    );
  };

  _onNotesChanged = (notes: string) => {
    this.setState({ notes });
  };

  render() {
    const { notes, selectedTaskIndex, showSearch } = this.state;
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
      <div className="mainview_content">
        <LabelWrapper
          label={`${this.props.listLabel}: ${this.state.tasks.length}`}
          className="mainview_tasklist"
          renderLabelItems={this._renderLabelItems}
        >
          {!!showSearch && <div>{this._renderSearchPanel()}</div>}
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
            <DetailsWrapper
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
    );
  }
}

interface DetailWrapperProps {
  task: Task;
  notes: string;
  notesux: ReactNode;
  detailsComponent: React.ComponentClass<DetailsComponentProps>;
  actions: { [key: string]: ActionConfig };
}

interface DetailsWrapperState {
  buttonsBusy: { [key: string]: boolean };
}

interface ActionCallbackResult {
  success: boolean;
  task?: Task;
}

class DetailsWrapper extends React.Component<
  DetailWrapperProps,
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
    return (
      <this.props.detailsComponent
        task={this.props.task}
        notes={this.props.notes}
        notesux={this.props.notesux}
        key={this.props.task.id}
        registerActionCallback={this._registerActionCallback}
      >
        <div className="mainview_button_row">
          {Object.entries(this.props.actions).map(([key, actionConfig]) => (
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
