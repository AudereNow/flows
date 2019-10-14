import React from "react";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import DataTable from "../Components/DataTable";
import LabelTextInput from "../Components/LabelTextInput";
import LabelWrapper from "../Components/LabelWrapper";
import NotesAudit from "../Components/NotesAudit";
import TaskList from "../Components/TaskList";
import TextItem from "../Components/TextItem";
import {
  ClaimEntry,
  declinePayment,
  getBestUserName,
  issuePayments,
  loadPayorTasks,
  savePaymentCompletedTask,
  Task
} from "../store/corestore";
import "./MainView.css";

type Props = {};
type State = {
  tasks: Task[];
  selectedTaskIndex: number;
  notes: string;
  paying: boolean;
};

class PayorPanel extends React.Component<Props, State> {
  state: State = {
    tasks: [],
    selectedTaskIndex: -1,
    notes: "",
    paying: false
  };

  async componentDidMount() {
    const tasks = await loadPayorTasks();
    this.setState({ tasks });
    if (tasks.length > 0) {
      this._onTaskSelect(0);
    }
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

  async _issuePayment(): Promise<boolean> {
    const task = this.state.tasks[this.state.selectedTaskIndex];
    const reimburseAmount = _getReimbursementTotal(task);

    if (reimburseAmount <= 0) {
      alert(`Unexpected reimbursement amount: ${reimburseAmount}`);
      return false;
    }

    const result = await issuePayments([
      {
        name: task.site.name,
        phoneNumber: task.site.phone || "+254739994489",
        currencyCode: "KES",
        amount: reimburseAmount,
        reason: "PromotionPayment",
        metadata: {
          taskID: task.id,
          payorName: getBestUserName(),
          payeeName: task.site.name
        }
      }
    ]);
    console.log("Response gotten:", result);

    // numQueued should be exactly 1 if the payment was successful
    if (result.data.numQueued === 0) {
      alert(result.data.entries[0].errorMessage);
      return false;
    }

    return true;
  }

  _onIssuePayment = async () => {
    try {
      this.setState({ paying: true });

      const paid = await this._issuePayment();
      if (paid) {
        await savePaymentCompletedTask(
          this.state.tasks[this.state.selectedTaskIndex],
          this.state.notes
        );
        this._removeSelectedTask();
      }
    } catch (e) {
      alert(`Error: ${(e && e.message) || e}`);
    } finally {
      this.setState({ paying: false });
    }
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
    const { paying } = this.state;
    const claimsTotal = _getReimbursementTotal(task);

    let cleanedData: any[] = [];
    task.entries.forEach((entry: ClaimEntry) => {
      let row: any = {};
      row["Patient"] = `${entry.patientFirstName} ${entry.patientLastName}`;
      row["Item"] = entry.item;
      row["Reimbursement"] = entry.claimedCost;
      cleanedData.push(row);
    });

    return (
      <LabelWrapper label="DETAILS">
        <TextItem data={{ Pharmacy: task.site.name }} />
        {!!task.site.phone && <TextItem data={{ Phone: task.site.phone }} />}
        <TextItem
          data={{ "Total Reimbursement": claimsTotal.toFixed(2) + " KSh" }}
        />
        <DataTable data={cleanedData} />
        {task.changes.map((change, index) => {
          return <NotesAudit key={change.timestamp + index} change={change} />;
        })}
        <LabelTextInput
          onTextChange={this._onNotesChanged}
          label="Notes"
          defaultValue={this.state.notes}
        />
        <div className="mainview_button_row">
          <Button
            disabled={paying}
            label={"Decline Payment"}
            onClick={this._onDecline}
          />
          <Button
            disabled={paying}
            label={paying ? "Issuing Payment..." : "Issue Payment"}
            onClick={this._onIssuePayment}
          />
        </div>
      </LabelWrapper>
    );
  };

  _onTaskSelect = (index: number) => {
    this.setState({ selectedTaskIndex: index });
  };

  render() {
    const { selectedTaskIndex } = this.state;
    return (
      <div className="mainview_content">
        <TaskList
          onSelect={this._onTaskSelect}
          tasks={this.state.tasks}
          renderItem={this._renderTaskListReimbursement}
          selectedItem={selectedTaskIndex}
          className="mainview_tasklist"
        />
        <div style={{ width: "100%" }}>
          {selectedTaskIndex >= 0 &&
            this._renderReimbursementDetails(
              this.state.tasks[selectedTaskIndex]
            )}
        </div>
      </div>
    );
  }
}

function _getReimbursementTotal(task: Task): number {
  const claimAmounts = task.entries.map(entry => {
    return entry.claimedCost;
  });
  return claimAmounts.reduce((sum, claimedCost) => sum + claimedCost);
}

export default PayorPanel;
