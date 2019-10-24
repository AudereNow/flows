import React, { ReactNode } from "react";
import { FocusedInputShape } from "react-dates";
import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import "../Components/DateRangePickerOverride.css";
import ImageRow from "../Components/ImageRow";
import LabelWrapper from "../Components/LabelWrapper";
import TextItem from "../Components/TextItem";
import { ClaimEntry, Task, TaskState } from "../sharedtypes";
import { changeTaskState } from "../store/corestore";
import debounce from "../util/debounce";
import { containsSearchTerm } from "../util/search";
import "./MainView.css";

const MIN_SAMPLE_FRACTION = 0.2;
const MIN_SAMPLES = 1;

type Props = {
  task: Task;
  actionable?: boolean;
  notesux: ReactNode;
  notes: string;
  searchTermGlobal?: string;
};
type State = {
  focusedInput: FocusedInputShape | null;
  searchTermDetails: string;
  showAllEntries: boolean;
};

export class AuditorDetails extends React.Component<Props, State> {
  state: State = {
    searchTermDetails: "",
    showAllEntries: false,
    focusedInput: null
  };

  _onShowAll = () => {
    this.setState({ showAllEntries: !this.state.showAllEntries });
  };

  _numSamples = () => {
    return this.state.showAllEntries
      ? this.props.task.entries.length
      : Math.max(
          Math.ceil(this.props.task.entries.length * MIN_SAMPLE_FRACTION),
          MIN_SAMPLES
        );
  };

  _onApprove = async () => {
    const { task } = this.props;
    task.entries = task.entries.map((entry, index) => {
      if (index < this._numSamples()) {
        return {
          ...entry,
          reviewed: true
        };
      }
      return entry;
    });

    await changeTaskState(task, TaskState.PAY, this.props.notes);
  };

  _onDecline = async () => {
    const { task } = this.props;
    await changeTaskState(task, TaskState.FOLLOWUP, this.props.notes);
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
    const { searchTermDetails } = this.state;
    const { searchTermGlobal } = this.props;
    let patientProps = [];
    if (!!entry.patientAge) patientProps.push(entry.patientAge);
    if (!!entry.patientSex && entry.patientSex!.length > 0)
      patientProps.push(entry.patientSex);
    const patientInfo =
      patientProps.length > 0 ? `(${patientProps.join(", ")})` : "";

    const date = new Date(entry.timestamp).toLocaleDateString();
    const patient = `${entry.patientFirstName} ${entry.patientLastName} ${patientInfo}`;

    let checkEntry = Object.assign({}, entry, date, patient);

    if (
      !!searchTermDetails &&
      !containsSearchTerm(searchTermDetails, checkEntry)
    ) {
      return null;
    }

    return (
      <LabelWrapper key={entry.patientID + patient}>
        <TextItem data={{ Date: date }} searchTermGlobal={searchTermGlobal} />
        <TextItem
          data={{ Patient: patient }}
          searchTermGlobal={searchTermGlobal}
        />

        <ImageRow
          searchTermGlobal={searchTermGlobal}
          images={this._extractImages(entry)}
        />
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

  render() {
    const showAllEntries =
      !!this.props.searchTermGlobal || this.state.showAllEntries;
    const { task, searchTermGlobal, notesux } = this.props;

    const samples = task.entries.slice(0, this._numSamples());
    const remaining = task.entries.length - this._numSamples();
    const actionable =
      this.props.actionable !== undefined ? this.props.actionable : true;

    return (
      <LabelWrapper className="mainview_details" label="DETAILS">
        <div className="mainview_spaced_row">
          <TextItem
            data={{ Pharmacy: task.site.name }}
            searchTermGlobal={searchTermGlobal}
          />

          <input
            type="text"
            onChange={this._handleSearchTermDetailsChange}
            placeholder="Filter Details"
          />
        </div>
        {samples.map(this._renderClaimEntryDetails)}
        {remaining > 0 && !showAllEntries && (
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
            .slice(this._numSamples(), task.entries.length)
            .map(this._renderClaimEntryDetails)}
        {notesux}
        {actionable && (
          <div className="mainview_button_row">
            <Button label="Decline" onClick={this._onDecline} />
            <Button label="Approve" onClick={this._onApprove} />
          </div>
        )}
      </LabelWrapper>
    );
  }
}
