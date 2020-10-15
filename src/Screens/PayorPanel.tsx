import "react-tabs/style/react-tabs.css";
import "./MainView.css";

import { ActionCallbackResult, DetailsComponentProps } from "./TaskPanel";
import { PaymentRecord, PaymentType, Task, TaskState } from "../sharedtypes";

import Button from "../Components/Button";
import LabelWrapper from "../Components/LabelWrapper";
import PharmacyInfo from "../Components/PharmacyInfo";
import React from "react";
import ReactTable from "react-table";
import TextItem from "../Components/TextItem";
import { configuredComponent } from "../util/configuredComponent";
import { dataStore } from "../transport/datastore";
import { formatCurrency } from "../util/currency";

const STATE_DESCRIPTIONS: { [key in TaskState]?: string } = {
  [TaskState.AUDIT]: "Awaiting Audit",
  [TaskState.PAY]: "Awaiting Payment",
  [TaskState.FOLLOWUP]: "Needs Ops Followup",
  [TaskState.REJECTED]: "Claim Rejected",
  [TaskState.COMPLETED]: "Paid",
  [TaskState.CSV]: "Not yet imported",
};

const PATIENT_CLAIMS_TABLE_COLUMNS = [
  {
    Header: "DATE",
    id: "Date",
    accessor: (entry: any) => new Date(entry.timestamp).toLocaleDateString(),
    minWidth: 70,
  },
  {
    id: "Patient",
    Header: "PATIENT",
    accessor: (entry: any) =>
      `${entry.patientFirstName} ${entry.patientLastName}`,
    minWidth: 90,
  },
  { id: "Item", Header: "ITEM", accessor: "item", minWidth: 60 },
  {
    id: "Rejected",
    Header: "REJECTED",
    accessor: (entry: any) =>
      entry.hasOwnProperty("rejected") ? entry.rejected.toString() : "",
    minWidth: 60,
  },
];

const RELATED_TASKS_TABLE_COLUMNS = [
  {
    Header: "Date",
    id: "Date",
    accessor: (entry: any) =>
      entry.updatedAt
        ? new Date(
            (entry.updatedAt as any).seconds * 1000 || entry.updatedAt
          ).toLocaleDateString()
        : "",
    minWidth: 70,
  },
  {
    id: "Claims",
    Header: "Claims",
    accessor: (task: any) => {
      return task.entries.length;
    },
    minWidth: 90,
  },
  {
    id: "Total Amount",
    Header: "Total Amount",
    accessor: (task: any) => {
      return formatCurrency(
        task.entries.reduce(
          (total: any, entry: any) => total + entry.claimedCost,
          0
        )
      );
    },
    minWidth: 70,
  },
  {
    id: "State",
    Header: "State",
    accessor: (task: any) => {
      return (STATE_DESCRIPTIONS as any)[task.state];
    },
    minWidth: 60,
  },
];

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
    showPreviousClaims: false,
  };

  componentDidMount() {
    this.props.registerActionCallback("approve", this._issuePayment);
    this.props.registerActionCallback("markApprove", this._issuePayment);
  }

  _issuePayment = async (): Promise<ActionCallbackResult> => {
    const { tasks } = this.props;
    const reimburseAmount = _getReimbursementTotal(tasks);

    const bundledTaskIds: string[] = [];
    const bundledPayments: PaymentRecord[] = tasks.slice(1).map((task) => {
      bundledTaskIds.push(task.id);
      return {
        paymentType: PaymentType.BUNDLED,
        bundledUnderTaskId: tasks[0].id,
        amount: 0,
      };
    });

    if (!this.props.realPayments) {
      const payment: PaymentRecord = {
        paymentType: PaymentType.MANUAL,
        amount: reimburseAmount,
      };
      if (tasks.length > 1) {
        payment.bundledTaskIds = bundledTaskIds;
      }
      return {
        success: true,
        payments: [payment, ...bundledPayments],
      };
    }

    if (reimburseAmount <= 0) {
      alert(`Unexpected reimbursement amount: ${reimburseAmount}`);
      return { success: false };
    }
    const recipient = {
      name: tasks[0].site.name,
      phoneNumber: tasks[0].site.phone,
      currencyCode: "KES",
      amount: reimburseAmount,
      reason: "PromotionPayment",
      metadata: {
        taskIDs: tasks.map((task) => task.id),
        payorName: dataStore.getBestUserName(),
        payeeName: tasks[0].site.name,
      },
    };
    const result = await dataStore.issuePayments([recipient]);
    console.log("Response gotten:", result);

    // numQueued should be exactly 1 if the payment was successful
    if (result.data.numQueued === 0) {
      alert(result.data.entries[0].errorMessage);
      return { success: false };
    }

    const payment: PaymentRecord = {
      paymentType: PaymentType.AFRICAS_TALKING,
      amount: reimburseAmount,
      recipient,
    };
    if (tasks.length > 1) {
      payment.bundledTaskIds = bundledTaskIds;
    }
    return {
      success: true,
      payments: [payment, ...bundledPayments],
    };
  };

  _toggleShowPreviousClaims = () => {
    if (!this.state.relatedTasks && !this.state.showPreviousClaims) {
      dataStore
        .loadPreviousTasks(
          this.props.tasks[0].site.name,
          this.props.tasks.map((task) => task.id)
        )
        .then((relatedTasks) => this.setState({ relatedTasks }));
    }
    this.setState({ showPreviousClaims: !this.state.showPreviousClaims });
  };

  _formatRelatedTasks = () => {
    return this.state.relatedTasks
      ? this.state.relatedTasks.map((relatedTask) => {
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
            State: STATE_DESCRIPTIONS[relatedTask.state],
          };
        })
      : null;
  };

  render() {
    const { tasks, notesux } = this.props;
    const claimsTotal = _getReimbursementTotal(tasks);
    const patientClaims = tasks.map((task: Task) => task.entries).flat();
    const relatedTasks = this.state.relatedTasks;

    return (
      <LabelWrapper className="mainview_details">
        <PharmacyInfo site={tasks[0].site} />
        <div className="mainview_padded">
          <TextItem
            data={{
              displayKey: "Total Reimbursement",
              searchKey: "reimbursement",
              value: formatCurrency(claimsTotal),
            }}
          />

          <ReactTable
            className="-striped -highlight"
            data={patientClaims}
            columns={PATIENT_CLAIMS_TABLE_COLUMNS}
            defaultPageSize={
              patientClaims.length <= 5 ? patientClaims.length : 5
            }
            defaultSorted={[
              {
                id: "Date",
                desc: true,
              },
            ]}
          />
        </div>
        {defaultConfig.dataStore.type === DataStoreType.FIREBASE && (
          <Button
            className="mainview_show_more_button"
            label={
              this.state.showPreviousClaims
                ? "- Hide Previous Claims"
                : "+ Show Previous Claims"
            }
            onClick={this._toggleShowPreviousClaims}
          />
        )}
        {this.state.showPreviousClaims &&
          (relatedTasks ? (
            relatedTasks.length > 0 ? (
              <ReactTable
                className="-striped -highlight"
                data={relatedTasks}
                columns={RELATED_TASKS_TABLE_COLUMNS}
                defaultPageSize={
                  relatedTasks.length <= 5 ? relatedTasks.length : 5
                }
                defaultSorted={[
                  {
                    id: "Date",
                    desc: true,
                  },
                ]}
              />
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
>(ConfigurablePayorDetails, (config) => ({
  realPayments: config.enableRealPayments,
}));

function _getReimbursementTotal(tasks: Task[]): number {
  const claimAmounts = tasks
    .map((task) =>
      task.entries.map((entry) => {
        return entry.rejected ? 0 : entry.claimedCost;
      })
    )
    .flat();
  return claimAmounts.reduce((sum, claimedCost) => sum + claimedCost);
}
