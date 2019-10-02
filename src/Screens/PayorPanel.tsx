import React from "react";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import LabelTextInput from "../Components/LabelTextInput";
import LabelWrapper from "../Components/LabelWrapper";
import TextItem from "../Components/TextItem";
import {
  ClaimEntry,
  ClaimTask,
  Task,
  tasksForRole,
  UserRole,
  ReimbursementTask
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
    const tasks = await tasksForRole(UserRole.PAYOR);
    this.setState({ tasks });
  }

  _renderTaskListReimbursement = (task: Task, isSelected: boolean) => {
    const reimbursement = task as ReimbursementTask;
    const claim = reimbursement.claim as ClaimTask;
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
        </div>
        <div>{"Total Reimbursement: " + claimsTotal + " KSh"}</div>
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

  _renderReimbursementDetails = (task: Task) => {
    const reimbursement = task as ReimbursementTask;
    const claim = reimbursement.claim as ClaimTask;
    if (!reimbursement || !claim || !claim.entries) {
      return null;
    }
    const claimAmounts = claim.entries.map(entry => {
      return entry.claimedCost;
    });
    const claimsTotal = claimAmounts.reduce(
      (sum, claimedCost) => sum + claimedCost
    );

    let cleanedData: any[] = [];
    claim.entries.forEach((entry: ClaimEntry) => {
      let row: any = {};
      row["Patient"] = `${entry.patientFirstName} ${entry.patientLastName}`;
      row["Item"] = entry.item;
      row["Reimbursement"] = entry.claimedCost;
      cleanedData.push(row);
    });

    return (
      <LabelWrapper label="DETAILS VIEW">
        <TextItem data={{ Pharmacy: claim.site.name }} />
        {!!claim.site.phone && <TextItem data={{ Phone: claim.site.phone }} />}
        <TextItem
          data={{ "Total Reimbursement": claimsTotal.toString() + "KSh" }}
        />
        <DataTable data={cleanedData} />
        <LabelTextInput onTextChange={this._onNotesChanged} label="Notes" />
        <div className="mainview_button_row">
          <Button
            label="Payment Complete"
            onClick={() => console.log("Payment complete")}
          />
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
