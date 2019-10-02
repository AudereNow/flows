import React from "react";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import ImageRow from "../Components/ImageRow";
import LabelTextInput from "../Components/LabelTextInput";
import LabelWrapper from "../Components/LabelWrapper";
import TextItem from "../Components/TextItem";
import {
  ClaimEntry,
  ClaimTask,
  Task,
  tasksForRole,
  UserRole
} from "../store/corestore";
import "./MainView.css";
import "react-tabs/style/react-tabs.css";
import TaskList from "../Components/TaskList";

const MIN_SAMPLE_FRACTION = 0.5;
const MIN_SAMPLES = 1;

type Props = {};
type State = {
  tasks: Task[];
  selectedTaskIndex: number;
  notes: string;
};

class AuditorPanel extends React.Component<Props, State> {
  state: State = {
    tasks: [],
    selectedTaskIndex: -1,
    notes: ""
  };

  async componentDidMount() {
    const tasks = await tasksForRole(UserRole.AUDITOR);
    this.setState({ tasks });
  }

  _renderTaskListClaim = (task: Task, isSelected: boolean) => {
    const claim = task as ClaimTask;
    const previewName =
      "mainview_task_preview" + (isSelected ? " selected" : "");
    const claimAmounts = claim.entries.map(entry => {
      return entry.claimedCost;
    });
    const claimsTotal = claimAmounts.reduce(
      (sum, claimedCost) => sum + claimedCost
    );
    return (
      <div className={previewName}>
        <div className="mainview_preview_header">
          <span>{claim.site.name}</span>
          <span>{claim.entries.length} Entries</span>
        </div>
        <div>{"Number of Claims: " + claim.entries.length}</div>
        <div>{"Total Reimbursement: " + claimsTotal.toFixed(2) + " KSh"}</div>
      </div>
    );
  };

  _onNotesChanged = (notes: string) => {
    this.setState({ notes });
  };

  _onApprove() {}

  _onDecline() {
    this.setState({ notes: "" });
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
      <LabelWrapper>
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
    const claim = task as ClaimTask;

    return (
      <LabelWrapper label="DETAILS VIEW">
        <TextItem data={{ Pharmacy: claim.site.name }} />
        {sample(claim.entries, MIN_SAMPLE_FRACTION, MIN_SAMPLES).map(this._renderClaimEntryDetails)}
        <LabelTextInput onTextChange={this._onNotesChanged} label={"Notes"} />
        <div className="mainview_button_row">
          <Button label="Decline" onClick={this._onDecline} />
          <Button label="Approve" onClick={this._onApprove} />
        </div>
      </LabelWrapper>
    );
  };

  _onTaskSelect = (index: number) => {
    this.setState({ selectedTaskIndex: index });
  };

  render() {
    return (
      <div>
        <TaskList
          onSelect={this._onTaskSelect}
          tasks={this.state.tasks}
          renderItem={this._renderTaskListClaim}
          className="mainview_tasklist"
        />
        <div style={{ width: "100%" }}>
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


function sample(arr: any[], minRate: number, minSamples: number): any[] {
  // Taken from https://stackoverflow.com/a/46545530/12071652
  const shuffledArr = arr
    .map(a => ({ sort: Math.random(), value: a}))
    .sort((a, b) => a.sort - b.sort)
    .map(a => a.value);
  const samplesToReturn = Math.max(Math.ceil(arr.length * minRate), minSamples);
  return shuffledArr.slice(0, samplesToReturn);
}
