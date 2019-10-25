import React, { ReactNode } from "react";
import "react-tabs/style/react-tabs.css";
import DataTable from "../Components/DataTable";
import LabelWrapper from "../Components/LabelWrapper";
import TextItem from "../Components/TextItem";
import { ClaimEntry, Task, TaskState } from "../sharedtypes";
import {
  changeTaskState,
  formatCurrency,
  getBestUserName,
  issuePayments
} from "../store/corestore";
import { getConfig } from "../store/remoteconfig";
import { DetailsComponentProps } from "./TaskPanel";
import "./MainView.css";

type State = {
  realPayments: boolean;
  paying: boolean;
};

export class PayorDetails extends React.Component<
  DetailsComponentProps,
  State
> {
  state = {
    realPayments: false,
    paying: false
  };

  async componentDidMount() {
    this.props.registerActionCallback("accept", this._issuePayment);
    const realPayments = await getConfig("enableRealPayments");
    this.setState({ realPayments });
  }

  _issuePayment = async () => {
    if (!this.state.realPayments) {
      await new Promise(res => setTimeout(res, 1000));
      return true;
    }
    const { task } = this.props;
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
  };

  _onIssuePayment = async () => {
    try {
      let paid = true;

      this.setState({ paying: true });

      if (this.state.realPayments) {
        paid = await this._issuePayment();
      }
      if (paid) {
        await changeTaskState(
          this.props.task,
          TaskState.COMPLETED,
          this.props.notes
        );
      }
    } catch (e) {
      alert(`Error: ${(e && e.message) || e}`);
    } finally {
      this.setState({ paying: false });
    }
  };

  render() {
    const { paying, realPayments } = this.state;
    const { notesux, task } = this.props;
    const claimsTotal = _getReimbursementTotal(task);

    let cleanedData: any[] = [];
    task.entries.sort((a, b) => a.timestamp - b.timestamp);
    task.entries.forEach((entry: ClaimEntry) => {
      let row: any = {};
      row["Date"] = new Date(entry.timestamp).toLocaleDateString();
      row["Patient"] = `${entry.patientFirstName} ${entry.patientLastName}`;
      row["Item"] = entry.item;
      row["Reimbursement"] = formatCurrency(entry.claimedCost);
      cleanedData.push(row);
    });

    return (
      <LabelWrapper className="mainview_details" label="DETAILS">
        <TextItem data={{ Pharmacy: task.site.name }} />
        {!!task.site.phone && <TextItem data={{ Phone: task.site.phone }} />}
        <TextItem
          data={{
            "Total Reimbursement": formatCurrency(claimsTotal)
          }}
        />
        <DataTable data={cleanedData} />
        {notesux}
        {this.props.children}
      </LabelWrapper>
    );
  }
}

export class PayorItem extends React.Component<{
  task: Task;
  isSelected: boolean;
}> {
  render() {
    const previewName =
      "mainview_task_preview" + (this.props.isSelected ? " selected" : "");
    const claimAmounts = this.props.task.entries.map(entry => {
      return entry.claimedCost;
    });
    const claimsTotal = claimAmounts.reduce(
      (sum, claimedCost) => sum + claimedCost
    );
    return (
      <div className={previewName}>
        <div className="mainview_preview_header">
          <span>{this.props.task.site.name}</span>
        </div>
        <div>{"Total Reimbursement: " + formatCurrency(claimsTotal)}</div>
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
