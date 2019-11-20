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
  numPatients: number;
  patients: PatientInfo[];
};

interface PatientInfo {
  patientId: string;
  currentClaims: ClaimEntry[];
}

function getInitialState(props: DetailsComponentProps): State {
  const patients = getPatients(props.task.entries);
  return {
    searchTermDetails: "",
    showAllEntries: false,
    showImages: !!props.hideImagesDefault ? false : true, // TODO: Clean up logic
    numPatients: Math.max(
      Math.ceil(patients.length * MIN_SAMPLE_FRACTION),
      MIN_SAMPLES
    ),
    patients
  };
}

export class AuditorDetails extends React.Component<
  DetailsComponentProps,
  State
> {
  state: State = getInitialState(this.props);

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
        const patientIndex = this.state.patients.findIndex(
          patient => patient.patientId === entry.patientID
        );
        if (
          (patientIndex !== -1 && patientIndex < this.state.numPatients) ||
          this.state.showAllEntries
        ) {
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

  _renderPatientDetails = (patient: PatientInfo) => {
    const { searchTermDetails, showImages } = this.state;
    let patientProps = [];
    const entry = patient.currentClaims[0];
    if (!!entry.patientAge) patientProps.push(entry.patientAge);
    if (!!entry.patientSex && entry.patientSex!.length > 0)
      patientProps.push(entry.patientSex);
    const patientInfo =
      patientProps.length > 0 ? `(${patientProps.join(", ")})` : "";

    const date = new Date(entry.timestamp).toLocaleDateString();
    const patientString = `${entry.patientFirstName} ${
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
        <div style={{ display: "flex", flexDirection: "row" }}>
          <TextItem
            data={{
              displayKey: "Patient",
              searchKey: "patient",
              value: patientString
            }}
          />
        </div>
        {patient.currentClaims.map(claim => (
          <React.Fragment>
            <TextItem
              data={{
                displayKey: "Date",
                searchKey: "date",
                value: new Date(claim.timestamp).toLocaleDateString()
              }}
            />
            <ImageRow
              showImages={showImages}
              images={this._extractImages(claim)}
            />
          </React.Fragment>
        ))}
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

    const patients = this.state.patients.slice(0, this.state.numPatients);
    const remaining = this.state.patients.length - this.state.numPatients;

    return (
      <LabelWrapper
        key={searchTermGlobal}
        className="mainview_details"
        label="DETAILS"
      >
        <PharmacyInfo name={task.site.name}>
          <div className="pharmacy_toggle_image_container">
            <Button
              onClick={this._toggleImages}
              label={!!showImages ? "Hide Images" : "Show Images"}
            />
          </div>
        </PharmacyInfo>
        <div className="mainview_spaced_row">
          <input
            type="text"
            onChange={this._handleSearchTermDetailsChange}
            placeholder="Filter Claims"
          />
        </div>
        {patients.map(this._renderPatientDetails)}
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
          this.state.patients
            .slice(this.state.numPatients, task.entries.length)
            .map(this._renderPatientDetails)}
        {notesux}
        {this.props.children}
      </LabelWrapper>
    );
  }
}

function getPatients(entries: ClaimEntry[]) {
  const entriesByPatient: { [id: string]: PatientInfo } = {};
  entries.forEach((entry, index) => {
    const id = entry.patientID || `Patient ${index}`;
    if (entriesByPatient[id]) {
      entriesByPatient[id].currentClaims.push(entry);
    } else {
      entriesByPatient[id] = {
        patientId: id,
        currentClaims: [entry]
      };
    }
  });
  return Object.values(entriesByPatient).sort(
    (a, b) => b.currentClaims.length - a.currentClaims.length
  );
}
