import React from "react";
import "react-tabs/style/react-tabs.css";
import ImageRow from "../Components/ImageRow";
import LabelWrapper from "../Components/LabelWrapper";
import TextItem from "../Components/TextItem";
import { ClaimEntry, Task } from "../sharedtypes";
import { formatCurrency } from "../store/corestore";
import { DetailsComponentProps } from "./TaskPanel";
import "./MainView.css";

export class OperatorDetails extends React.Component<DetailsComponentProps> {
  _extractImages = (claim: ClaimEntry) => {
    const claimImages = [];
    if (!!claim.photoMedUri) {
      claimImages.push({
        url: claim.photoMedUri,
        label: claim.item
      });
    }
    if (!!claim.photoIDUri) {
      claimImages.push({
        url: claim.photoIDUri,
        label: "ID: " + claim.patientID
      });
    }
    if (!!claim.photoMedBatchUri) {
      claimImages.push({ url: claim.photoMedBatchUri, label: "Batch" });
    }
    return claimImages;
  };

  _renderClaimEntryDetails = (entry: ClaimEntry) => {
    let patientProps = [];
    if (!!entry.patientAge) patientProps.push(entry.patientAge);
    if (!!entry.patientSex && entry.patientSex!.length > 0)
      patientProps.push(entry.patientSex);
    const patientInfo =
      patientProps.length > 0 ? `(${patientProps.join(", ")})` : "";

    return (
      <LabelWrapper key={patientInfo}>
        <TextItem
          data={{ Date: new Date(entry.timestamp).toLocaleDateString() }}
        />
        <TextItem
          data={{
            Patient: `${entry.patientFirstName} ${entry.patientLastName} ${patientInfo}`
          }}
        />
        <ImageRow images={this._extractImages(entry)} />
      </LabelWrapper>
    );
  };

  render() {
    return (
      <LabelWrapper className="mainview_details" label="DETAILS">
        <TextItem data={{ Pharmacy: this.props.task.site.name }} />
        {this.props.task.entries.map(this._renderClaimEntryDetails)}
        {this.props.notesux}
        {this.props.children}
      </LabelWrapper>
    );
  }
}

export class OperatorItem extends React.Component<{
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
          <span>{this.props.task.entries.length} Claims</span>
        </div>
        <div>{"Total Reimbursement: " + formatCurrency(claimsTotal)}</div>
      </div>
    );
  }
}
