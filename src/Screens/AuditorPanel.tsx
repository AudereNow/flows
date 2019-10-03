import React from "react";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import ImageRow from "../Components/ImageRow";
import LabelTextInput from "../Components/LabelTextInput";
import LabelWrapper from "../Components/LabelWrapper";
import TextItem from "../Components/TextItem";
import {
  ClaimEntry,
  Task,
  declineAudit,
  loadAuditorTasks,
  getLatestTaskNote,
  saveAuditorApprovedTask
} from "../store/corestore";
import "./MainView.css";
import "react-tabs/style/react-tabs.css";
import TaskList from "../Components/TaskList";

const MIN_SAMPLE_FRACTION = 0.2;
const MIN_SAMPLES = 1;

type Props = {};
type State = {
  tasks: Task[];
  selectedTaskIndex: number;
  notes: string;
  numSamples: number;
};

class AuditorPanel extends React.Component<Props, State> {
  state: State = {
    tasks: [],
    selectedTaskIndex: -1,
    notes: "",
    numSamples: 0
  };

  async componentDidMount() {
    const tasks = await loadAuditorTasks();
    this.setState({ tasks });
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

  _onNotesChanged = (notes: string) => {
    this.setState({ notes });
  };

  _onApprove = async () => {
    await saveAuditorApprovedTask(
      this.state.tasks[this.state.selectedTaskIndex],
      this.state.notes,
      this.state.numSamples,
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
    let patientProps = [];
    if (!!entry.patientAge) patientProps.push(entry.patientAge);
    if (!!entry.patientSex && entry.patientSex!.length > 0)
      patientProps.push(entry.patientSex);
    const patientInfo =
      patientProps.length > 0 ? `(${patientProps.join(", ")})` : "";

    return (
      <LabelWrapper key={entry.patientID}>
        <TextItem
          data={{ Date: new Date(entry.timestamp).toLocaleDateString() }}
        />
        <TextItem
          data={{
            Patient: `${entry.patientFirstName} ${entry.patientLastName} ${patientInfo}`
          }}
        />
        <TextItem data={{ Item: entry.item }} />
        <ImageRow imageURLs={this._extractImageURLs(entry)} />
      </LabelWrapper>
    );
  };

  _renderClaimDetails = (task: Task) => {
    const samples = task.entries.slice(0, this.state.numSamples);

    return (
      <LabelWrapper label="DETAILS VIEW">
        <TextItem data={{ Pharmacy: task.site.name }} />
        {samples.map(this._renderClaimEntryDetails)}
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
    const numSamples = Math.max(Math.ceil(this.state.tasks[index].entries.length * MIN_SAMPLE_FRACTION), MIN_SAMPLES);
    this.setState({
      selectedTaskIndex: index,
      numSamples
    });
  };

  render() {
    return (
      <div className="mainview_content">
        <TaskList
          onSelect={this._onTaskSelect}
          tasks={this.state.tasks}
          renderItem={this._renderTaskListClaim}
          className="mainview_tasklist"
        />
        <div>
          {this.state.selectedTaskIndex >= 0 &&
            this._renderClaimDetails(
              this.state.tasks[this.state.selectedTaskIndex]
            )}
        </div>
      </div>
    );
  }
}

export default AuditorPanel;
