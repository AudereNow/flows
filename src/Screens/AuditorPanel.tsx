import React from "react";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import ImageRow from "../Components/ImageRow";
import LabelTextInput from "../Components/LabelTextInput";
import LabelWrapper from "../Components/LabelWrapper";
import NotesAudit from "../Components/NotesAudit";
import TaskList from "../Components/TaskList";
import TextItem from "../Components/TextItem";
import {
  ClaimEntry,
  declineAudit,
  formatCurrency,
  loadAuditorTasks,
  loadCompletedPaymentTasks,
  loadRejectedTasks,
  saveAuditorApprovedTask,
  Task
} from "../store/corestore";
import debounce from "../util/debounce";
import { containsSearchTerm } from "../util/search";
import "./MainView.css";

const MIN_SAMPLE_FRACTION = 0.2;
const MIN_SAMPLES = 1;

type Props = {};
type State = {
  tasks: Task[];
  selectedTaskIndex: number;
  allTasks: Task[];
  notes: string;
  numSamples: number;
  searchTermGlobal: string;
  searchTermDetails: string;
  showAllEntries: boolean;
};

enum FilterType {
  TODO = "Todo",
  COMPLETED = "Completed",
  REJECTED = "Rejected"
}

class AuditorPanel extends React.Component<Props, State> {
  state: State = {
    tasks: [],
    selectedTaskIndex: -1,
    allTasks: [],
    notes: "",
    numSamples: 0,
    searchTermGlobal: "",
    searchTermDetails: "",
    showAllEntries: false
  };
  filterType: FilterType = FilterType.TODO;

  async componentDidMount() {
    this._setupTaskList();
  }

  _setupTaskList = async () => {
    let tasks;
    switch (this.filterType) {
      case FilterType.TODO:
        tasks = await loadAuditorTasks();
        break;
      case FilterType.COMPLETED:
        tasks = await loadCompletedPaymentTasks();
        break;
      case FilterType.REJECTED:
        tasks = await loadRejectedTasks();
        break;
    }
    if (tasks) {
      this.setState({
        tasks,
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

  _renderTaskListClaim = (task: Task, isSelected: boolean) => {
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
          <span>{task.entries.length} Entries</span>
        </div>
        <div>{"Number of Claims: " + task.entries.length}</div>
        <div>{"Total Reimbursement: " + formatCurrency(claimsTotal)}</div>
      </div>
    );
  };

  _onShowAll = () => {
    this.setState({ showAllEntries: !this.state.showAllEntries });
  };

  _onNotesChanged = (notes: string) => {
    this.setState({ notes });
  };

  _onApprove = async () => {
    await saveAuditorApprovedTask(
      this.state.tasks[this.state.selectedTaskIndex],
      this.state.notes,
      this.state.numSamples
    );
    this._removeSelectedTask();
  };

  _onDecline = async () => {
    const task = this.state.tasks[this.state.selectedTaskIndex];
    await declineAudit(task, this.state.notes);
    this._removeSelectedTask();
  };

  _removeSelectedTask() {
    const selectedTaskId = this.state.tasks[this.state.selectedTaskIndex].id;
    const indexInMaster = this.state.allTasks.findIndex(task => {
      return task.id === selectedTaskId;
    });
    const tasksCopy = this.state.allTasks.slice(0);
    tasksCopy.splice(indexInMaster, 1);
    this.setState({ allTasks: tasksCopy }, () => {
      const tasks = this._computeFilteredTasks(this.state.searchTermGlobal);
      const newIndex =
        this.state.selectedTaskIndex >= tasks.length
          ? tasks.length - 1
          : this.state.selectedTaskIndex;
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

  _renderClaimDetails = (task: Task) => {
    const { showAllEntries } = this.state;
    const samples = task.entries.slice(0, this.state.numSamples);
    const remaining = task.entries.length - this.state.numSamples;
    return (
      <LabelWrapper label="DETAILS">
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
        {task.changes.map(change => {
          return <NotesAudit change={change} />;
        })}
        {this.filterType === FilterType.TODO && (
          <LabelTextInput
            onTextChange={this._onNotesChanged}
            label={"Notes"}
            defaultValue={this.state.notes}
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
  };

  _onTaskSelect = (index: number) => {
    const numSamples = Math.max(
      Math.ceil(this.state.tasks[index].entries.length * MIN_SAMPLE_FRACTION),
      MIN_SAMPLES
    );
    this.setState({
      selectedTaskIndex: index,
      numSamples,
      showAllEntries: false
    });
  };

  _computeFilteredTasks = (searchTerm: string) => {
    return this.state.allTasks.filter(task => {
      return (
        searchTerm === "" ||
        containsSearchTerm(searchTerm, task.site) ||
        task.entries.some(entry => {
          return containsSearchTerm(searchTerm, entry);
        })
      );
    });
  };

  _handleSearchTermGlobalChange = debounce((searchTerm: string) => {
    const { selectedTaskIndex, tasks } = this.state;
    const selectedId =
      selectedTaskIndex >= 0 ? tasks[selectedTaskIndex].id : "";
    const filteredTasks = this._computeFilteredTasks(searchTerm);
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

  render() {
    const { selectedTaskIndex } = this.state;
    return (
      <div className="mainview_content">
        <TaskList
          onSelect={this._onTaskSelect}
          tasks={this.state.tasks}
          renderItem={this._renderTaskListClaim}
          selectedItem={selectedTaskIndex}
          className="mainview_tasklist"
          label={this._getLabelFromFilterType()}
          onSearchTermUpdate={this._handleSearchTermGlobalChange}
          filterItems={[
            FilterType.TODO,
            FilterType.COMPLETED,
            FilterType.REJECTED
          ]}
          onFilterUpdate={this._handleFilterUpdate}
        />
        <div style={{ width: "100%" }}>
          {selectedTaskIndex >= 0 &&
            this._renderClaimDetails(this.state.tasks[selectedTaskIndex])}
        </div>
      </div>
    );
  }
}

export default AuditorPanel;
