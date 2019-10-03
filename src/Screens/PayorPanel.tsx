import React from "react";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import LabelTextInput from "../Components/LabelTextInput";
import LabelWrapper from "../Components/LabelWrapper";
import TextItem from "../Components/TextItem";
import {
  ClaimEntry,
  Task,
  loadPayorTasks,
  declinePayment,
  getLatestTaskNote,
  savePaymentCompletedTask
} from "../store/corestore";
import "./MainView.css";
import "react-tabs/style/react-tabs.css";
import TaskList from "../Components/TaskList";
import DataTable from "../Components/DataTable";

type Props = {};
type State = {
  tasks: Task[];
  selectedTaskIndex: number;
  notes: string;
};

class PayorPanel extends React.Component<Props, State> {
  state: State = {
    tasks: [],
    selectedTaskIndex: -1,
    notes: ""
  };

  async componentDidMount() {
    const tasks = await loadPayorTasks();
    this.setState({ tasks });
  }

  _renderTaskListReimbursement = (task: Task, isSelected: boolean) => {
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
        </div>
        <div>{"Total Reimbursement: " + claimsTotal.toFixed(2) + " KSh"}</div>
      </div>
    );
  };

  _onNotesChanged = (notes: string) => {
    this.setState({ notes });
  };

  _onPaymentComplete = async () => {
    await savePaymentCompletedTask(
      this.state.tasks[this.state.selectedTaskIndex],
      this.state.notes
    );
    this._removeSelectedTask();
  };

  _onDecline = async () => {
    const task = this.state.tasks[this.state.selectedTaskIndex];
    await declinePayment(task, this.state.notes);
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

  _renderReimbursementDetails = (task: Task) => {
    const claimAmounts = task.entries.map(entry => {
      return entry.claimedCost;
    });
    const claimsTotal = claimAmounts.reduce(
      (sum, claimedCost) => sum + claimedCost
    );

    let cleanedData: any[] = [];
    task.entries.forEach((entry: ClaimEntry) => {
      let row: any = {};
      row["Patient"] = `${entry.patientFirstName} ${entry.patientLastName}`;
      row["Item"] = entry.item;
      row["Reimbursement"] = entry.claimedCost;
      cleanedData.push(row);
    });

    return (
      <LabelWrapper label="DETAILS VIEW">
        <TextItem data={{ Pharmacy: task.site.name }} />
        {!!task.site.phone && <TextItem data={{ Phone: task.site.phone }} />}
        <TextItem
          data={{ "Total Reimbursement": claimsTotal.toFixed(2) + " KSh" }}
        />
        <DataTable data={cleanedData} />
        <LabelTextInput
          onTextChange={this._onNotesChanged}
          label="Notes"
          defaultValue={getLatestTaskNote(task)}
        />
        <div className="mainview_button_row">
          <Button label="Payment Complete" onClick={this._onPaymentComplete} />
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
          renderItem={this._renderTaskListReimbursement}
          className="mainview_tasklist"
        />
        <div style={{ width: "100%" }}>
          {this.state.selectedTaskIndex >= 0 &&
            this._renderReimbursementDetails(
              this.state.tasks[this.state.selectedTaskIndex]
            )}
        </div>
      </div>
    );
  }
}

export default PayorPanel;
