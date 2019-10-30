import { json2csv } from "json-2-csv";
import moment, { Moment } from "moment";
import React, { Fragment, ReactNode } from "react";
import { DateRangePicker, FocusedInputShape } from "react-dates";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import LabelWrapper from "../Components/LabelWrapper";
import Notes from "../Components/Notes";
import TaskList from "../Components/TaskList";
import { Task, TaskChangeRecord, TaskState } from "../sharedtypes";
import { defaultConfig, TaskConfig } from "../store/config";
import { getChanges, subscribeToTasks } from "../store/corestore";
import debounce from "../util/debounce";
import { containsSearchTerm, DateRange, withinDateRange } from "../util/search";
import "./MainView.css";

export interface Filters {
  patient?: boolean;
  name?: boolean;
  id?: boolean;
  phone?: boolean;
  item?: boolean;
}

type Props = {
  taskState: TaskState;
  listLabel: string;
  itemComponent: React.ComponentClass<{ task: Task; isSelected: boolean }>;
  detailsComponent: React.ComponentClass<{
    task: Task;
    actionable?: boolean;
    notesux: ReactNode;
    notes: string;
    searchTermGlobal?: string;
    filters: Filters;
  }>;
  actionable?: boolean;
  registerForTabSelectCallback: (onTabSelect: () => boolean) => void;
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
  filters: Filters;
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
    notes: "",
    filters: {}
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
      if (selectedTaskIndex === -1) {
        selectedTaskIndex = 0;
        selectedTaskId = tasks[0].id;
        notes = "";
      } else {
        selectedTaskIndex = tasks.findIndex(task => task.id === selectedTaskId);
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

    this.setState({
      allTasks: tasks,
      tasks,
      changes,
      selectedTaskIndex,
      selectedTaskId,
      notes
    });
  };

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
        selectedTaskIndex: selectedIndex,
        notes: ""
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
      selectedTaskIndex: selectedIndex,
      notes: ""
    });
  };

  _clearSearch = () => {
    const { allTasks } = this.state;
    this._inputRef.current!.value = "";
    this.setState({
      searchDates: { startDate: null, endDate: null },
      tasks: allTasks,
      filters: {},
      selectedTaskIndex: 0
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

  _onCheckBoxSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const name = event.target.name;
    const checked = event.target.checked;
    let filters = this.state.filters;
    (filters as any)[name] = checked;
    this.setState({ filters });
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
      <div className="mainview_search_container">
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
                <div className="mainview_input_container" key={key + index}>
                  <input
                    type="checkbox"
                    name={key}
                    onChange={this._onCheckBoxSelect}
                    checked={(this.state.filters as any)[key] || false}
                  />
                  <span className="mainview_input_label">
                    {patientKeyMap[key]}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mainview_spaced_row">
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
    const {
      selectedTaskIndex,
      showSearch,
      searchTermGlobal,
      notes
    } = this.state;
    const actionable =
      this.props.actionable !== undefined ? this.props.actionable : true;
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
            <this.props.detailsComponent
              task={this.state.tasks[selectedTaskIndex]}
              actionable={actionable}
              notesux={notesux}
              notes={notes}
              filters={this.state.filters}
              key={this.state.tasks[selectedTaskIndex].id}
              searchTermGlobal={searchTermGlobal}
            />
          )}
        </div>
      </div>
    );
  }
}
