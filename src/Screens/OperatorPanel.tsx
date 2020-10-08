import "react-tabs/style/react-tabs.css";
import "./MainView.css";

import Button from "../Components/Button";
import { ClaimEntry } from "../sharedtypes";
import ClaimNotes from "../Components/ClaimNotes";
import { DetailsComponentProps } from "./TaskPanel";
import ImageRow from "../Components/ImageRow";
import LabelWrapper from "../Components/LabelWrapper";
import PharmacyInfo from "../Components/PharmacyInfo";
import React from "react";
import ReactMarkdown from "react-markdown";
import TextItem from "../Components/TextItem";
import { configuredComponent } from "../util/configuredComponent";

interface State {
  showImages: boolean;
}

interface Props {
  instructions: string;
}

class ConfigurableOperatorDetails extends React.Component<
  DetailsComponentProps & Props,
  State
> {
  constructor(props: DetailsComponentProps & Props) {
    super(props);
    this.state = { showImages: true };
  }

  componentDidMount() {
    this.props.registerActionCallback("save", this._onSave);
  }

  _onSave = async () => {
    return { success: true, tasks: this.props.tasks };
  };

  _extractImages = (claim: ClaimEntry) => {
    const claimImages = [];
    //if (!!claim.photoMedUri) {
    //  claimImages.push({
    //    url: claim.photoMedUri,
    //    label: { value: claim.item, searchKey: "item" },
    //  });
    //}
    if (!!claim.photoIDUri) {
      claimImages.push({
        url: claim.photoIDUri,
        label: {
          displayKey: "ID",
          value: claim.patientID || "",
          searchKey: "patient",
        },
      });
    }
    if (!!claim.photoMedBatchUri) {
      claimImages.push({
        url: claim.photoMedBatchUri,
        label: { value: "Batch", searchKey: "" },
      });
    }
    return claimImages;
  };

  _toggleImages = () => {
    this.setState({ showImages: !this.state.showImages });
  };

  _renderClaimEntryDetails = (entry: ClaimEntry, index: number) => {
    let patientProps = [];
    if (!!entry.patientAge) patientProps.push(entry.patientAge);
    if (!!entry.patientSex && entry.patientSex!.length > 0)
      patientProps.push(entry.patientSex);
    const patientInfo =
      patientProps.length > 0 ? `(${patientProps.join(", ")})` : "";

    return (
      <LabelWrapper key={patientInfo + "_" + index}>
        <div className="mainview_padded">
          <TextItem
            data={{
              displayKey: "Date",
              searchKey: "date",
              value: new Date(entry.timestamp).toLocaleDateString(),
            }}
          />
          <TextItem
            data={{
              displayKey: "Patient",
              searchKey: "patient",
              value: `${entry.patientFirstName} ${
                entry.patientLastName
              } ${patientInfo} ${entry.phone || ""}`,
            }}
          />
          <ImageRow
            showImages={this.state.showImages}
            images={this._extractImages(entry)}
          />
          <ClaimNotes
            claimIndex={(entry as any).originalIndex}
            task={this.props.tasks[index]}
            notes={entry.notes || ""}
          />
        </div>
      </LabelWrapper>
    );
  };

  render() {
    return (
      <LabelWrapper className="mainview_details">
        <PharmacyInfo site={this.props.tasks[0].site}>
          <div className="pharmacy_toggle_image_container">
            <Button
              className={"pharmacy_button"}
              onClick={this._toggleImages}
              label={!!this.state.showImages ? "Hide Images" : "Show Images"}
            />
          </div>
        </PharmacyInfo>
        {this.props.tasks.map(task =>
          task.entries.map((entry, index) => {
            return this._renderClaimEntryDetails(entry, index);
          })
        )}
        <div className="mainview_instructions_header">Instructions:</div>
        <ReactMarkdown source={this.props.instructions} />
        {this.props.notesux}
        {this.props.children}
      </LabelWrapper>
    );
  }
}

export const OperatorDetails = configuredComponent<
  DetailsComponentProps,
  Props
>(ConfigurableOperatorDetails, config => ({
  instructions: config.opsInstructions,
}));
