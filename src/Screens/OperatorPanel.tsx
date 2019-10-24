import React, { ReactNode } from "react";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import ImageRow from "../Components/ImageRow";
import LabelWrapper from "../Components/LabelWrapper";
import TextItem from "../Components/TextItem";
import { ClaimEntry, Task, TaskState } from "../sharedtypes";
import { changeTaskState } from "../store/corestore";
import "./MainView.css";
import Filters from "./TaskPanel";

type Props = {
  task: Task;
  filters: Filters;
  notesux: ReactNode;
  searchTermGlobal?: string;
  notes: string;
};

export class OperatorDetails extends React.Component<Props> {
  _onReject = async () => {
    await changeTaskState(
      this.props.task,
      TaskState.REJECTED,
      this.props.notes
    );
  };

  _onApprove = async () => {
    await changeTaskState(this.props.task, TaskState.PAY, this.props.notes);
  };

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
    const { searchTermGlobal, filters } = this.props;
    return (
      <LabelWrapper key={patientInfo}>
        <TextItem
          data={{
            displayKey: "Date",
            searchKey: "date",
            value: new Date(entry.timestamp).toLocaleDateString()
          }}
          filters={filters}
          searchTermGlobal={searchTermGlobal}
        />
        <TextItem
          data={{
            displayKey: "Patient",
            searchKey: "patient",
            value: `${entry.patientFirstName} ${entry.patientLastName} ${patientInfo}`
          }}
          filters={filters}
          searchTermGlobal={searchTermGlobal}
        />
        <ImageRow
          searchTermGlobal={searchTermGlobal}
          filters={filters}
          images={this._extractImages(entry)}
        />
      </LabelWrapper>
    );
  };

  render() {
    const { filters, searchTermGlobal } = this.props;
    return (
      <LabelWrapper className="mainview_details" label="DETAILS">
        <TextItem
          data={{
            displayKey: "Pharmacy",
            searchKey: "name",
            value: this.props.task.site.name
          }}
          filters={filters}
          searchTermGlobal={searchTermGlobal}
        />
        {this.props.task.entries.map(this._renderClaimEntryDetails)}
        {this.props.notesux}
        <div className="mainview_button_row">
          <Button label="Reject" onClick={this._onReject} />
          <Button label="Approve for Payment" onClick={this._onApprove} />
        </div>
      </LabelWrapper>
    );
  }
}
