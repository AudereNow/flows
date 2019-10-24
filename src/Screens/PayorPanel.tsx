import React, { ReactNode } from "react";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
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
import "./MainView.css";

type Props = {
  task: Task;
  notesux: ReactNode;
  notes: string;
  searchTermGlobal?: string;
};

type State = {
  realPayments: boolean;
  paying: boolean;
};

export class PayorDetails extends React.Component<Props, State> {
  state = {
    realPayments: false,
    paying: false
  };

  async componentDidMount() {
    const realPayments = await getConfig("enableRealPayments");
    this.setState({ realPayments });
  }

  async _issuePayment(): Promise<boolean> {
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
  }

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

  _onDecline = async () => {
    const { task } = this.props;
    await changeTaskState(task, TaskState.FOLLOWUP, this.props.notes);
  };

  render() {
    const { paying, realPayments } = this.state;
    const { notesux, task, searchTermGlobal } = this.props;
    const claimsTotal = _getReimbursementTotal(task);
    const payLabel = realPayments
      ? paying
        ? "Issuing Payment..."
        : "Issue Payment"
      : "Mark Paid";

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
        {!!task.site.phone && (
          <TextItem
            data={{ Phone: task.site.phone }}
            searchTermGlobal={searchTermGlobal}
          />
        )}
        <TextItem
          searchTermGlobal={searchTermGlobal}
          data={{
            "Total Reimbursement": formatCurrency(claimsTotal)
          }}
        />
        <DataTable data={cleanedData} />
        {notesux}
        <div className="mainview_button_row">
          <Button
            disabled={paying}
            label={"Decline Payment"}
            onClick={this._onDecline}
          />
          <Button
            disabled={paying}
            label={payLabel}
            onClick={this._onIssuePayment}
          />
        </div>
      </LabelWrapper>
    );
  }
}

function _getReimbursementTotal(task: Task): number {
  const claimAmounts = task.entries.map(entry => {
    return entry.claimedCost;
  });
  return claimAmounts.reduce((sum, claimedCost) => sum + claimedCost);
}
