import React from "react";
import { FocusedInputShape } from "react-dates";
import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import "../Components/DateRangePickerOverride.css";
import ImageRow from "../Components/ImageRow";
import LabelTextInput from "../Components/LabelTextInput";
import LabelWrapper from "../Components/LabelWrapper";
import NotesAudit from "../Components/NotesAudit";
import TextItem from "../Components/TextItem";
import { ClaimEntry, Task, TaskState, TaskChangeRecord } from "../sharedtypes";
import { changeTaskState, formatCurrency } from "../store/corestore";
import debounce from "../util/debounce";
import { containsSearchTerm } from "../util/search";
import "./MainView.css";

const MIN_SAMPLE_FRACTION = 0.2;
const MIN_SAMPLES = 1;

type Props = {
  task: Task;
  changes: TaskChangeRecord[];
  actionable?: boolean;
};
type State = {
  notes: string;
  numSamples: number;
  focusedInput: FocusedInputShape | null;
  searchTermDetails: string;
  showAllEntries: boolean;
};

export class AuditorItem extends React.Component<{
  task: Task;
  isSelected: boolean;
}> {
  render() {
    const { task, isSelected } = this.props;
    const previewName =
      "mainview_task_preview" + (isSelected ? " selected" : "");
    const claimAmounts = task.entries.map(entry => {
      return entry.claimedCost;
    });
    const claimsTotal = claimAmounts.reduce(
      (sum, claimedCost) => sum + claimedCost
    );
    return (
      <div className={previewName}>
        <div className="mainview_preview_header">
          <span>{task.site.name}</span>
          <span>{task.entries.length} Claims</span>
        </div>
        <div>{"Total Reimbursement: " + formatCurrency(claimsTotal)}</div>
      </div>
    );
  }
}

export class AuditorDetails extends React.Component<Props, State> {
  state: State = {
    notes: "",
    numSamples: 0,
    searchTermDetails: "",
    showAllEntries: false,
    focusedInput: null
  };
  _inputRef: React.RefObject<HTMLInputElement> = React.createRef();

  _onShowAll = () => {
    this.setState({ showAllEntries: !this.state.showAllEntries });
  };

  _onNotesChanged = (notes: string) => {
    this.setState({ notes });
  };

  _onApprove = async () => {
    const { task } = this.props;
    task.entries = task.entries.map((entry, index) => {
      if (index < this.state.numSamples) {
        return {
          ...entry,
          reviewed: true
        };
      }
      return entry;
    });

    await changeTaskState(task, TaskState.PAY, this.state.notes);
  };

  _onDecline = async () => {
    const { task } = this.props;
    await changeTaskState(task, TaskState.FOLLOWUP, this.state.notes);
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
        <TextItem data={{ Date: date }} />
        <TextItem
          data={{
            Patient: patient
          }}
        />
        <ImageRow images={this._extractImages(entry)} />
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
    const { showAllEntries } = this.state;
    const { task, changes } = this.props;
    const samples = task.entries.slice(0, this.state.numSamples);
    const remaining = task.entries.length - this.state.numSamples;
    const actionable =
      this.props.actionable !== undefined ? this.props.actionable : true;
    return (
      <LabelWrapper className="mainview_details" label="DETAILS">
        <div className="mainview_spaced_row">
          <TextItem data={{ Pharmacy: task.site.name }} />
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
        <div className="mainview_actions_so_far_header">Actions so far:</div>
        {changes.map((change, index) => {
          return <NotesAudit key={change.by + index} change={change} />;
        })}
        {actionable && (
          <LabelTextInput
            onTextChange={this._onNotesChanged}
            label={"Notes"}
            value={this.state.notes}
          />
        )}
        {actionable && (
          <div className="mainview_button_row">
            <Button label="Decline" onClick={this._onDecline} />
            <Button label="Approve" onClick={this._onApprove} />
          </div>
        )}
      </LabelWrapper>
    );
  }

  _onTaskSelect = (index: number) => {
    const { task } = this.props;
    const numSamples = Math.max(
      Math.ceil(task.entries.length * MIN_SAMPLE_FRACTION),
      MIN_SAMPLES
    );
    this.setState({
      numSamples,
      showAllEntries: false,
      notes: ""
    });
  };

  _onFocusChange = (focusedInput: FocusedInputShape | null) => {
    this.setState({ focusedInput });
  };
}
