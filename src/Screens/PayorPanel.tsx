import React from "react";
import "react-tabs/style/react-tabs.css";
import DataTable from "../Components/DataTable";
import LabelWrapper from "../Components/LabelWrapper";
import TextItem from "../Components/TextItem";
import { ClaimEntry, Task } from "../sharedtypes";
import {
  formatCurrency,
  getBestUserName,
  issuePayments
} from "../store/corestore";
import { DetailsComponentProps } from "./TaskPanel";
import { configuredComponent } from "../util/configuredComponent";
import "./MainView.css";

type State = {
  paying: boolean;
};

interface RemoteProps {
  realPayments: boolean;
}

class ConfigurablePayorDetails extends React.Component<
  DetailsComponentProps & RemoteProps,
  State
> {
  state = {
    paying: false
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
      return { success: false };
    }

    return { success: true };
  };

  render() {
    const { filters, searchTermGlobal, task, notesux } = this.props;
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
        <TextItem
          searchTermGlobal={searchTermGlobal}
          data={{
            displayKey: "Pharmacy",
            searchKey: "name",
            value: task.site.name
          }}
          filters={filters}
        />
        {!!task.site.phone && (
          <TextItem
            data={{
              displayKey: "Phone",
              searchKey: "phone",
              value: task.site.phone
            }}
            filters={filters}
            searchTermGlobal={searchTermGlobal}
          />
        )}
        <TextItem
          searchTermGlobal={searchTermGlobal}
          data={{
            displayKey: "Total Reimbursement",
            searchKey: "reimbursement",
            value: formatCurrency(claimsTotal)
          }}
          filters={filters}
        />
        <DataTable data={cleanedData} />
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
