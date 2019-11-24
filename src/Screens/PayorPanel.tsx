import React from "react";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import DataTable from "../Components/DataTable";
import LabelWrapper from "../Components/LabelWrapper";
import PharmacyInfo from "../Components/PharmacyInfo";
import TextItem from "../Components/TextItem";
import { ClaimEntry, Task, TaskState } from "../sharedtypes";
import {
  formatCurrency,
  getBestUserName,
  issuePayments,
  loadPreviousTasks
} from "../store/corestore";
import { configuredComponent } from "../util/configuredComponent";
import "./MainView.css";
import { DetailsComponentProps } from "./TaskPanel";

const STATE_DESCRIPTIONS: { [key in TaskState]: string } = {
  [TaskState.AUDIT]: "Awaiting Audit",
  [TaskState.PAY]: "Awaiting Payment",
  [TaskState.FOLLOWUP]: "Needs Ops Followup",
  [TaskState.REJECTED]: "Claim Rejected",
  [TaskState.COMPLETED]: "Paid",
  [TaskState.CSV]: "Not yet imported"
};

interface RemoteProps {
  realPayments: boolean;
}
interface State {
  relatedTasks?: Task[];
  showPreviousClaims: boolean;
}

class ConfigurablePayorDetails extends React.Component<
  DetailsComponentProps & RemoteProps,
  State
> {
  state: State = {
    showPreviousClaims: false
  };

  componentDidMount() {
    this.props.registerActionCallback("approve", this._issuePayment);
  }

  _issuePayment = async () => {
    if (!this.props.realPayments) {
      await new Promise(res => setTimeout(res, 1000));
      return { success: true };
    }
    const { task } = this.props;
    const reimburseAmount = _getReimbursementTotal(task);

    if (reimburseAmount <= 0) {
      alert(`Unexpected reimbursement amount: ${reimburseAmount}`);
      return { success: false };
    }
    const result = await issuePayments([
      {
        name: task.site.name,
        phoneNumber: task.site.phone,
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
      return { success: false };
    }

    return { success: true };
  };

  _toggleShowPreviousClaims = () => {
    if (!this.state.relatedTasks && !this.state.showPreviousClaims) {
      loadPreviousTasks(
        this.props.task.site.name,
        this.props.task.id
      ).then(relatedTasks => this.setState({ relatedTasks }));
    }
    this.setState({ showPreviousClaims: !this.state.showPreviousClaims });
  };

  render() {
    const { task, notesux } = this.props;
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

    let relatedTaskRows: any[] | null = this.state.relatedTasks
      ? this.state.relatedTasks.map(relatedTask => {
          return {
            Date: relatedTask.updatedAt
              ? new Date(
                  (relatedTask.updatedAt as any).seconds * 1000 ||
                    relatedTask.updatedAt
                ).toLocaleDateString()
              : "",
            Claims: relatedTask.entries.length,
            "Total Amount": formatCurrency(
              relatedTask.entries.reduce(
                (total, entry) => total + entry.claimedCost,
                0
              )
            ),
            State: STATE_DESCRIPTIONS[relatedTask.state]
          };
        })
      : null;

    return (
      <LabelWrapper className="mainview_details" label="DETAILS">
        <PharmacyInfo name={task.site.name} />
        {!!task.site.phone && (
          <TextItem
            data={{
              displayKey: "Phone",
              searchKey: "pharmacy",
              value: task.site.phone
            }}
          />
        )}
        <TextItem
          data={{
            displayKey: "Total Reimbursement",
            searchKey: "reimbursement",
            value: formatCurrency(claimsTotal)
          }}
        />
        <DataTable data={cleanedData} />
        <Button
          label={
            this.state.showPreviousClaims
              ? "Hide Previous Claims ▲"
              : "Show Previous Claims ▼"
          }
          onClick={this._toggleShowPreviousClaims}
        />
        {this.state.showPreviousClaims &&
          (relatedTaskRows ? (
            relatedTaskRows.length ? (
              <DataTable data={relatedTaskRows} />
            ) : (
              <div className="mainview_details_text">No Previous Claims</div>
            )
          ) : (
            <div className="mainview_details_text">Loading...</div>
          ))}
        {notesux}
        {this.props.children}
      </LabelWrapper>
    );
  }
}

export const PayorDetails = configuredComponent<
  DetailsComponentProps,
  RemoteProps
>(ConfigurablePayorDetails, config => ({
  realPayments: config.enableRealPayments
}));

function _getReimbursementTotal(task: Task): number {
  const claimAmounts = task.entries.map(entry => {
    return entry.claimedCost;
  });
  return claimAmounts.reduce((sum, claimedCost) => sum + claimedCost);
}
