import { json2csv } from "json-2-csv";
import { Moment } from "moment";
import React, { Fragment } from "react";
import { DateRangePicker, FocusedInputShape } from "react-dates";
import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import "react-tabs/style/react-tabs.css";
import filterIcon from "../assets/filter.svg";
import Button from "../Components/Button";
import "../Components/DateRangePickerOverride.css";
import DropDown from "../Components/Dropdown";
import ImageRow from "../Components/ImageRow";
import LabelTextInput from "../Components/LabelTextInput";
import LabelWrapper from "../Components/LabelWrapper";
import NotesAudit from "../Components/NotesAudit";
import TaskList from "../Components/TaskList";
import TextItem from "../Components/TextItem";
import { ClaimEntry, Task, TaskState, TaskChangeRecord } from "../sharedtypes";
import {
  changeTaskState,
  formatCurrency,
  loadTasks,
  getChanges
} from "../store/corestore";
import debounce from "../util/debounce";
import { containsSearchTerm, DateRange, withinDateRange } from "../util/search";
import "./MainView.css";

const MIN_SAMPLE_FRACTION = 0.2;
const MIN_SAMPLES = 1;

type Props = {
  task: Task;
  changes: TaskChangeRecord[];
};
type State = {
  tasks: Task[];
  changes: TaskChangeRecord[][];
  selectedTaskIndex: number;
  allTasks: Task[];
  notes: string;
  numSamples: number;
  focusedInput: FocusedInputShape | null;
  searchTermGlobal: string;
  searchTermDetails: string;
  showAllEntries: boolean;
  searchDates: DateRange;
  showSearch: boolean;
};

enum FilterType {
  TODO = "Todo",
  COMPLETED = "Completed",
  REJECTED = "Rejected"
}

export class AuditorItem extends React.Component<{
  task: Task;
  isSelected: boolean;
}> {
  render() {
    const { task, isSelected } = this.props;
    const previewName =
      "mainview_task_preview" + (isSelected ? " selected" : "");
    const claimAmounts = task.entries.map(entry => {
      return entry.claimedCost;
    });
    const claimsTotal = claimAmounts.reduce(
      (sum, claimedCost) => sum + claimedCost
    );
    return (
      <div className={previewName}>
        <div className="mainview_preview_header">
          <span>{task.site.name}</span>
          <span>{task.entries.length} Claims</span>
        </div>
        <div>{"Total Reimbursement: " + formatCurrency(claimsTotal)}</div>
      </div>
    );
  }
}

export class AuditorDetails extends React.Component<Props, State> {
  state: State = {
    tasks: [],
    changes: [],
    selectedTaskIndex: -1,
    allTasks: [],
    notes: "",
    numSamples: 0,
    searchTermGlobal: "",
    searchTermDetails: "",
    showAllEntries: false,
    searchDates: { startDate: null, endDate: null },
    showSearch: false,
    focusedInput: null
  };
  filterType: FilterType = FilterType.TODO;
  _inputRef: React.RefObject<HTMLInputElement> = React.createRef();

  async componentDidMount() {
    await this._setupTaskList();
  }

  _setupTaskList = async () => {
    let tasks;
    switch (this.filterType) {
      case FilterType.TODO:
        tasks = await loadTasks(TaskState.AUDIT);
        break;
      case FilterType.COMPLETED:
        tasks = await loadTasks(TaskState.COMPLETED);
        break;
      case FilterType.REJECTED:
        tasks = await loadTasks(TaskState.REJECTED);
        break;
    }
    if (tasks) {
      const changes = await Promise.all(tasks.map(t => getChanges(t.id)));
      this.setState({
        tasks,
        changes,
        allTasks: tasks,
        selectedTaskIndex: -1,
        numSamples: 0
      });
      if (tasks.length > 0) {
        this._onTaskSelect(0);
      }
    }
  };

  _getLabelFromFilterType = (): string => {
    switch (this.filterType) {
      case FilterType.COMPLETED:
        return "COMPLETED PAYMENTS";
      case FilterType.REJECTED:
        return "REJECTED CLAIMS";
    }
    return "ITEMS TO REVIEW";
  };

  _onShowAll = () => {
    this.setState({ showAllEntries: !this.state.showAllEntries });
  };

  _onNotesChanged = (notes: string) => {
    this.setState({ notes });
  };

  _onApprove = async () => {
    const task = this.state.tasks[this.state.selectedTaskIndex];
    task.entries = task.entries.map((entry, index) => {
      if (index < this.state.numSamples) {
        return {
          ...entry,
          reviewed: true
        };
      }
      return entry;
    });

    await changeTaskState(task, TaskState.PAY, this.state.notes);
    this._removeSelectedTask();
  };

  _onDecline = async () => {
    const task = this.state.tasks[this.state.selectedTaskIndex];
    await changeTaskState(task, TaskState.FOLLOWUP, this.state.notes);
    this._removeSelectedTask();
  };

  _removeSelectedTask() {
    const {
      allTasks,
      searchDates,
      searchTermGlobal,
      selectedTaskIndex,
      tasks
    } = this.state;
    const selectedTaskId = tasks[selectedTaskIndex].id;
    const indexInMaster = allTasks.findIndex(task => {
      return task.id === selectedTaskId;
    });
    const tasksCopy = allTasks.slice(0);
    tasksCopy.splice(indexInMaster, 1);
    this.setState({ allTasks: tasksCopy }, () => {
      const tasks = this._computeFilteredTasks(searchTermGlobal, searchDates);
      const newIndex =
        selectedTaskIndex >= tasks.length
          ? tasks.length - 1
          : selectedTaskIndex;
      this.setState({ tasks, selectedTaskIndex: newIndex });
    });
  }

  _extractImages = (claim: ClaimEntry) => {
    const claimImages = [];
    if (!!claim.photoMedUri) {
      claimImages.push({
        url: claim.photoMedUri,
        label: claim.item
      });
    }
    if (!!claim.photoIDUri) {
      claimImages.push({
        url: claim.photoIDUri,
        label: "ID: " + claim.patientID
      });
    }
    if (!!claim.photoMedBatchUri) {
      claimImages.push({ url: claim.photoMedBatchUri, label: "Batch" });
    }
    return claimImages;
  };

  _renderClaimEntryDetails = (entry: ClaimEntry) => {
    const { searchTermDetails } = this.state;
    let patientProps = [];
    if (!!entry.patientAge) patientProps.push(entry.patientAge);
    if (!!entry.patientSex && entry.patientSex!.length > 0)
      patientProps.push(entry.patientSex);
    const patientInfo =
      patientProps.length > 0 ? `(${patientProps.join(", ")})` : "";

    const date = new Date(entry.timestamp).toLocaleDateString();
    const patient = `${entry.patientFirstName} ${entry.patientLastName} ${patientInfo}`;

    let checkEntry = Object.assign({}, entry, date, patient);

    if (
      !!searchTermDetails &&
      !containsSearchTerm(searchTermDetails, checkEntry)
    ) {
      return null;
    }

    return (
      <LabelWrapper key={entry.patientID + patient}>
        <TextItem data={{ Date: date }} />
        <TextItem
          data={{
            Patient: patient
          }}
        />
        <ImageRow images={this._extractImages(entry)} />
      </LabelWrapper>
    );
  };

  _setSearchTermDetails = debounce((input: string) => {
    this.setState({ searchTermDetails: input });
  }, 500);

  _handleSearchTermDetailsChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    let input = event.target.value;
    this._setSearchTermDetails(input);
  };

  render() {
    const { showAllEntries } = this.state;
    const { task, changes } = this.props;
    const samples = task.entries.slice(0, this.state.numSamples);
    const remaining = task.entries.length - this.state.numSamples;
    return (
      <LabelWrapper className="mainview_details" label="DETAILS">
        <div className="mainview_spaced_row">
          <TextItem data={{ Pharmacy: task.site.name }} />
          <input
            type="text"
            onChange={this._handleSearchTermDetailsChange}
            placeholder="Filter Details"
          />
        </div>
        {samples.map(this._renderClaimEntryDetails)}
        {remaining > 0 && (
          <div className="mainview_button_row">
            <Button
              label={
                showAllEntries ? "Hide \u25b2" : `Show ${remaining} More \u25bc`
              }
              onClick={this._onShowAll}
            />
          </div>
        )}
        {remaining > 0 &&
          showAllEntries &&
          task.entries
            .slice(this.state.numSamples, task.entries.length)
            .map(this._renderClaimEntryDetails)}
        <div className="mainview_actions_so_far_header">Actions so far:</div>
        {changes.map((change, index) => {
          return <NotesAudit key={change.by + index} change={change} />;
        })}
        {this.filterType === FilterType.TODO && (
          <LabelTextInput
            onTextChange={this._onNotesChanged}
            label={"Notes"}
            value={this.state.notes}
          />
        )}
        {this.filterType === FilterType.TODO && (
          <div className="mainview_button_row">
            <Button label="Decline" onClick={this._onDecline} />
            <Button label="Approve" onClick={this._onApprove} />
          </div>
        )}
      </LabelWrapper>
    );
  }

  _onTaskSelect = (index: number) => {
    const numSamples = Math.max(
      Math.ceil(this.state.tasks[index].entries.length * MIN_SAMPLE_FRACTION),
      MIN_SAMPLES
    );
    this.setState({
      selectedTaskIndex: index,
      numSamples,
      showAllEntries: false,
      notes: ""
    });
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

  _handleFilterUpdate = (filterItem: string) => {
    this.filterType = filterItem as FilterType;
    this._setupTaskList();
  };

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

  _onFilterItemClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const filterItem = event.currentTarget.getAttribute("data-name");
    if (filterItem === null) {
      return;
    }
    this._handleFilterUpdate(filterItem);
  };

  _onSearchClick = () => {
    this.setState({ showSearch: !this.state.showSearch });
  };

  _renderLabelItems = () => {
    const filterTypes = [
      FilterType.TODO,
      FilterType.COMPLETED,
      FilterType.REJECTED
    ];
    return (
      <Fragment>
        <div className="labelwrapper_header_icon" onClick={this._onSearchClick}>
          &nbsp;&#x1F50E;
        </div>
        <div className="labelwrapper_header_icon">
          <DropDown labelURI={filterIcon}>
            {filterTypes.map(item => (
              <div
                key={item}
                className="labelwrapper_dropdown_text"
                data-name={item}
                onClick={this._onFilterItemClick}
              >
                {item}
              </div>
            ))}
          </DropDown>
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

  _downloadCSV = () => {
    const { tasks } = this.state;

    if (tasks.length === 0) {
      alert("There are no tasks to download! Please adjust your search.");
    }
    const fileName = tasks[0].site.name + "-" + tasks[0].id;
    let rows: any[] = [];
    const json2csvOptions = { checkSchemaDifferences: true };
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
}
