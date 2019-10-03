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
  getLatestTaskNote,
  loadOperatorTasks,
  saveOperatorCompletedTask,
  Task
} from "../store/corestore";
import "./MainView.css";

type Props = {
  searchPhrase?: string;
};
type State = {
  tasks: Task[];
  selectedTaskIndex: number;
  notes: string;
};

class OperatorPanel extends React.Component<Props, State> {
  state: State = {
    tasks: [],
    selectedTaskIndex: -1,
    notes: ""
  };

  async componentDidMount() {
    const tasks = await loadOperatorTasks();
    this.setState({ tasks });
  }

  _renderTaskList = (task: Task, isSelected: boolean) => {
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
        <div>{"Claims to Review: " + task.entries.length}</div>
        <div>{"Total Reimbursement: " + claimsTotal.toFixed(2) + " KSh"}</div>
      </div>
    );
  };

  _onNotesChanged = (notes: string) => {
    this.setState({ notes });
  };

  _onCompleted = async () => {
    await saveOperatorCompletedTask(
      this.state.tasks[this.state.selectedTaskIndex],
      this.state.notes
    );
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
    return (
      <LabelWrapper label="DETAILS VIEW">
        <TextItem data={{ Pharmacy: task.site.name }} />
        {task.entries.map(this._renderClaimEntryDetails)}
        <LabelTextInput
          onTextChange={this._onNotesChanged}
          label={"Notes"}
          defaultValue={getLatestTaskNote(task)}
        />
        <div className="mainview_button_row">
          <Button label="Mark Completed" onClick={this._onCompleted} />
        </div>
      </LabelWrapper>
    );
  };

  _onTaskSelect = (index: number) => {
    this.setState({ selectedTaskIndex: index });
  };

  render() {
    return (
      <div className="mainview_content">
        <TaskList
          onSelect={this._onTaskSelect}
          tasks={this.state.tasks}
          renderItem={this._renderTaskList}
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

export default OperatorPanel;
