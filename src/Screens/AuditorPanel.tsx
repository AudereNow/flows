import React from "react";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import ImageRow from "../Components/ImageRow";
import LabelTextInput from "../Components/LabelTextInput";
import LabelWrapper from "../Components/LabelWrapper";
import TaskList from "../Components/TaskList";
import TextItem from "../Components/TextItem";
import {
  ClaimEntry,
  declineAudit,
  getLatestTaskNote,
  loadAuditorTasks,
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
  notes: string;
  numSamples: number;
  searchPhrase: string;
  showAllEntries: boolean;
};

class AuditorPanel extends React.Component<Props, State> {
  state: State = {
    tasks: [],
    searchPhrase: "",
    selectedTaskIndex: -1,
    notes: "",
    numSamples: 0,
    showAllEntries: false
  };

  async componentDidMount() {
    const tasks = await loadAuditorTasks();
    this.setState({ tasks });
    if (tasks.length > 0) {
      this._onTaskSelect(0);
    }
  }

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
        <div>{"Total Reimbursement: " + claimsTotal.toFixed(2) + " KSh"}</div>
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
    const tasksCopy = this.state.tasks.slice(0);

    tasksCopy.splice(this.state.selectedTaskIndex, 1);
    const newIndex =
      this.state.selectedTaskIndex >= tasksCopy.length
        ? tasksCopy.length - 1
        : this.state.selectedTaskIndex;
    this.setState({ tasks: tasksCopy, selectedTaskIndex: newIndex });
  }

  _extractImageURLs = (claim: ClaimEntry) => {
    const claimImageURLs: string[] = [];
    if (!!claim.photoIDUri) {
      claimImageURLs.push(claim.photoIDUri);
    }
    if (!!claim.photoMedBatchUri) {
      claimImageURLs.push(claim.photoMedBatchUri);
    }
    if (!!claim.photoMedUri) {
      claimImageURLs.push(claim.photoMedUri);
    }
    return claimImageURLs;
  };

  _renderClaimEntryDetails = (entry: ClaimEntry) => {
    const { searchPhrase } = this.state;
    let patientProps = [];
    if (!!entry.patientAge) patientProps.push(entry.patientAge);
    if (!!entry.patientSex && entry.patientSex!.length > 0)
      patientProps.push(entry.patientSex);
    const patientInfo =
      patientProps.length > 0 ? `(${patientProps.join(", ")})` : "";

    const date = new Date(entry.timestamp).toLocaleDateString();
    const patient = `${entry.patientFirstName} ${entry.patientLastName} ${patientInfo}`;

    let checkEntry = Object.assign({}, entry, date, patient);

    if (!!searchPhrase && !containsSearchTerm(searchPhrase, checkEntry)) {
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
        <TextItem data={{ Item: entry.item }} />
        <ImageRow imageURLs={this._extractImageURLs(entry)} />
      </LabelWrapper>
    );
  };

  _setSearchPhrase = debounce((input: string) => {
    this.setState({ searchPhrase: input });
  }, 500);

  _handlePhraseChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let input = event.target.value;
    this._setSearchPhrase(input);
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
            onChange={this._handlePhraseChange}
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
        <LabelTextInput
          onTextChange={this._onNotesChanged}
          label={"Notes"}
          defaultValue={getLatestTaskNote(task)}
        />
        <div className="mainview_button_row">
          <Button label="Decline" onClick={this._onDecline} />
          <Button label="Approve" onClick={this._onApprove} />
        </div>
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
