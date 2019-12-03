import React, { ChangeEvent } from "react";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import CheckBox from "../Components/CheckBox";
import ClaimNotes from "../Components/ClaimNotes";
import ImageRow from "../Components/ImageRow";
import LabelWrapper from "../Components/LabelWrapper";
import PharmacyInfo from "../Components/PharmacyInfo";
import TextItem from "../Components/TextItem";
import { ClaimEntry } from "../sharedtypes";
import { setRejectedClaim } from "../store/corestore";
import "./MainView.css";
import { DetailsComponentProps } from "./TaskPanel";

interface State {
  showImages: boolean;
}

export class OperatorDetails extends React.Component<
  DetailsComponentProps,
  State
> {
  constructor(props: DetailsComponentProps) {
    super(props);
    this.state = { showImages: true };
  }

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

  _toggleImages = () => {
    this.setState({ showImages: !this.state.showImages });
  };

  _toggleRejectClaim = async (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    const claimIndex = event.currentTarget.getAttribute("data-value");
    if (!claimIndex) return;

    await setRejectedClaim(this.props.task, parseInt(claimIndex), checked);
  };

  _renderClaimEntryDetails = (entry: ClaimEntry, claimIndex: number) => {
    let patientProps = [];
    if (!!entry.patientAge) patientProps.push(entry.patientAge);
    if (!!entry.patientSex && entry.patientSex!.length > 0)
      patientProps.push(entry.patientSex);
    const patientInfo =
      patientProps.length > 0 ? `(${patientProps.join(", ")})` : "";

    return (
      <LabelWrapper key={claimIndex}>
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
        <ImageRow
          showImages={this.state.showImages}
          images={this._extractImages(entry)}
        />
        <CheckBox
          checked={entry.rejected === undefined ? false : entry.rejected}
          label={"Rejected"}
          value={claimIndex.toString()}
          onCheckBoxSelect={this._toggleRejectClaim}
        />
        <ClaimNotes
          claimIndex={claimIndex}
          task={this.props.task}
          notes={entry.notes || ""}
        />
      </LabelWrapper>
    );
  };

  render() {
    return (
      <LabelWrapper className="mainview_details" label="DETAILS">
        <PharmacyInfo site={this.props.task.site}>
          <div className="pharmacy_toggle_image_container">
            <Button
              onClick={this._toggleImages}
              label={!!this.state.showImages ? "Hide Images" : "Show Images"}
            />
          </div>
        </PharmacyInfo>
        {this.props.task.entries.map((entry, index) => {
          return this._renderClaimEntryDetails(entry, index);
        })}
        {this.props.notesux}
        {this.props.children}
      </LabelWrapper>
    );
  }
}
