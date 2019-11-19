import React from "react";
import "react-tabs/style/react-tabs.css";
import ImageRow from "../Components/ImageRow";
import LabelWrapper from "../Components/LabelWrapper";
import TextItem from "../Components/TextItem";
import { ClaimEntry } from "../sharedtypes";
import "./MainView.css";
import { DetailsComponentProps } from "./TaskPanel";

export class OperatorDetails extends React.Component<DetailsComponentProps> {
  _extractImages = (claim: ClaimEntry) => {
    const claimImages = [];
    if (!!claim.photoMedUri) {
      claimImages.push({
        url: claim.photoMedUri,
        label: { value: claim.item, searchKey: "item" }
      });
    }
    if (!!claim.photoIDUri) {
      claimImages.push({
        url: claim.photoIDUri,
        label: {
          displayKey: "ID",
          value: claim.patientID || "",
          searchKey: "patientID"
        }
      });
    }
    if (!!claim.photoMedBatchUri) {
      claimImages.push({
        url: claim.photoMedBatchUri,
        label: { value: "Batch", searchKey: "" }
      });
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
          data={{
            displayKey: "Date",
            searchKey: "date",
            value: new Date(entry.timestamp).toLocaleDateString()
          }}
        />
        <TextItem
          data={{
            displayKey: "Patient",
            searchKey: "patient",
            value: `${entry.patientFirstName} ${
              entry.patientLastName
            } ${patientInfo} ${entry.phone || ""}`
          }}
        />
        <ImageRow images={this._extractImages(entry)} />
      </LabelWrapper>
    );
  };

  render() {
    return (
      <LabelWrapper className="mainview_details" label="DETAILS">
        <TextItem
          data={{
            displayKey: "Pharmacy",
            searchKey: "name",
            value: this.props.task.site.name
          }}
        />
        {this.props.task.entries.map(this._renderClaimEntryDetails)}
        {this.props.notesux}
        {this.props.children}
      </LabelWrapper>
    );
  }
}
