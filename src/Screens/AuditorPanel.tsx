import React from "react";
import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import ImageRow from "../Components/ImageRow";
import LabelWrapper from "../Components/LabelWrapper";
import PharmacyInfo from "../Components/PharmacyInfo";
import TextItem, { SearchContext } from "../Components/TextItem";
import { ClaimEntry } from "../sharedtypes";
import debounce from "../util/debounce";
import { containsSearchTerm } from "../util/search";
import "./MainView.css";
import { DetailsComponentProps } from "./TaskPanel";
const MIN_SAMPLE_FRACTION = 0.2;
const MIN_SAMPLES = 1;

type State = {
  searchTermDetails: string;
  showAllEntries: boolean;
  showImages: boolean;
  numSamples: number;
};

export class AuditorDetails extends React.Component<
  DetailsComponentProps,
  State
> {
  state: State = {
    searchTermDetails: "",
    showAllEntries: false,
    showImages: !!this.props.hideImagesDefault ? false : true, // TODO: Clean up logic
    numSamples: Math.max(
      Math.ceil(this.props.task.entries.length * MIN_SAMPLE_FRACTION),
      MIN_SAMPLES
    )
  };

  static contextType = SearchContext;

  componentDidMount() {
    this.props.registerActionCallback("approve", this._onApprove);
  }

  _onShowAll = () => {
    this.setState({ showAllEntries: !this.state.showAllEntries });
  };

  _onApprove = async () => {
    const task = {
      ...this.props.task,
      entries: this.props.task.entries.map((entry, index) => {
        if (index < this.state.numSamples || this.state.showAllEntries) {
          return {
            ...entry,
            reviewed: true
          };
        }
        return entry;
      })
    };
    return { success: true, task };
  };

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
    const { searchTermDetails, showImages } = this.state;
    let patientProps = [];
    if (!!entry.patientAge) patientProps.push(entry.patientAge);
    if (!!entry.patientSex && entry.patientSex!.length > 0)
      patientProps.push(entry.patientSex);
    const patientInfo =
      patientProps.length > 0 ? `(${patientProps.join(", ")})` : "";

    const date = new Date(entry.timestamp).toLocaleDateString();
    const patient = `${entry.patientFirstName} ${
      entry.patientLastName
    } ${patientInfo} ${entry.phone || ""}`;

    let checkEntry = Object.assign({}, entry, date, patient);

    if (
      !!searchTermDetails &&
      !containsSearchTerm(searchTermDetails, checkEntry)
    ) {
      return null;
    }

    return (
      <LabelWrapper key={JSON.stringify(entry)}>
        <TextItem
          data={{ displayKey: "Date", searchKey: "date", value: date }}
        />
        <div style={{ display: "flex", flexDirection: "row" }}>
          <TextItem
            data={{
              displayKey: "Patient",
              searchKey: "patient",
              value: patient
            }}
          />
        </div>
        <ImageRow showImages={showImages} images={this._extractImages(entry)} />
      </LabelWrapper>
    );
  };

  _setSearchTermDetails = debounce((input: string) => {
    this.setState({ searchTermDetails: input });
  }, 500);

  _handleSearchTermDetailsChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    let input = event.target.value;
    this._setSearchTermDetails(input);
  };

  _toggleImages = () => {
    this.setState({ showImages: !this.state.showImages });
  };

  render() {
    const { searchTermGlobal } = this.context;
    const showAllEntries = !!searchTermGlobal || this.state.showAllEntries;
    const { task, notesux } = this.props;
    const { showImages } = this.state;

    const samples = task.entries.slice(0, this.state.numSamples);
    const remaining = task.entries.length - this.state.numSamples;
    return (
      <LabelWrapper
        key={searchTermGlobal}
        className="mainview_details"
        label="DETAILS"
      >
        <PharmacyInfo
          showImages={showImages}
          onToggleImages={this._toggleImages}
          name={task.site.name}
        />
        <div className="mainview_spaced_row">
          <input
            type="text"
            onChange={this._handleSearchTermDetailsChange}
            placeholder="Filter Details"
          />
        </div>
        {samples.map(this._renderClaimEntryDetails)}
        {remaining > 0 && (
          <div className="mainview_button_row">
            <Button
              label={
                showAllEntries ? "Hide \u25b2" : `Show ${remaining} More \u25bc`
              }
              onClick={this._onShowAll}
            />
          </div>
        )}
        {remaining > 0 &&
          showAllEntries &&
          task.entries
            .slice(this.state.numSamples, task.entries.length)
            .map(this._renderClaimEntryDetails)}
        {notesux}
        {this.props.children}
      </LabelWrapper>
    );
  }
}
