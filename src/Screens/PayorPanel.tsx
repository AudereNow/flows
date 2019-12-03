import React from "react";
import ReactTable from "react-table";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import LabelWrapper from "../Components/LabelWrapper";
import PharmacyInfo from "../Components/PharmacyInfo";
import TextItem from "../Components/TextItem";
import { Task, TaskState } from "../sharedtypes";
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

const PATIENT_CLAIMS_TABLE_COLUMNS = [
  {
    Header: "DATE",
    id: "Date",
    accessor: (entry: any) => new Date(entry.timestamp).toLocaleDateString(),
    minWidth: 70
  },
  {
    id: "Patient",
    Header: "PATIENT",
    accessor: (entry: any) =>
      `${entry.patientFirstName} ${entry.patientLastName}`,
    minWidth: 90
  },
  { id: "Item", Header: "ITEM", accessor: "item", minWidth: 70 },
  {
    id: "Reimbursement",
    Header: "REIMBURSEMENT",
    accessor: (entry: any) => formatCurrency(entry.claimedCost),
    minWidth: 60
  }
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
    minWidth: 70
  },
  {
    id: "Claims",
    Header: "Claims",
    accessor: (task: any) => {
      return task.entries.length;
    },
    minWidth: 90
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
    minWidth: 70
  },
  {
    id: "State",
    Header: "State",
    accessor: (task: any) => {
      return (STATE_DESCRIPTIONS as any)[task.state];
    },
    minWidth: 60
  }
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

  _formatRelatedTasks = () => {
    return this.state.relatedTasks
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
  };

  render() {
    const { task, notesux } = this.props;
    const claimsTotal = _getReimbursementTotal(task);
    const patientClaims = task.entries;
    const relatedTasks = this.state.relatedTasks;

    return (
      <LabelWrapper className="mainview_details">
        <PharmacyInfo site={task.site} />
        {!!task.site.phone && (
          <TextItem
            data={{
              displayKey: "Phone",
              searchKey: "pharmacy",
              value: task.site.phone
            }}
          />
        )}
        <div className="mainview_padded">
          <TextItem
            data={{
              displayKey: "Total Reimbursement",
              searchKey: "reimbursement",
              value: formatCurrency(claimsTotal)
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
                desc: true
              }
            ]}
          />
        </div>
        <Button
          className="mainview_show_more_button"
          label={
            this.state.showPreviousClaims
              ? "- Hide Previous Claims"
              : "+ Show Previous Claims"
          }
          onClick={this._toggleShowPreviousClaims}
        />
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
                    desc: true
                  }
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
>(ConfigurablePayorDetails, config => ({
  realPayments: config.enableRealPayments
}));

function _getReimbursementTotal(task: Task): number {
  const claimAmounts = task.entries.map(entry => {
    return entry.rejected ? 0 : entry.claimedCost;
  });
  return claimAmounts.reduce((sum, claimedCost) => sum + claimedCost);
}
