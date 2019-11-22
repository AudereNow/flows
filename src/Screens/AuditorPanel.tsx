import moment from "moment";
import React, { ChangeEvent } from "react";
import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import ReactTable from "react-table";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import CheckBox from "../Components/CheckBox";
import ClaimNotes from "../Components/ClaimNotes";
import ImageRow from "../Components/ImageRow";
import LabelWrapper from "../Components/LabelWrapper";
import PharmacyInfo from "../Components/PharmacyInfo";
import TextItem, { SearchContext } from "../Components/TextItem";
import { ClaimEntry } from "../sharedtypes";
import {
  formatCurrency,
  getPatientHistories,
  getPharmacyClaims,
  PatientHistory,
  setRejectedClaim
} from "../store/corestore";
import debounce from "../util/debounce";
import { containsSearchTerm } from "../util/search";
import "./MainView.css";
import { DetailsComponentProps } from "./TaskPanel";

const MIN_SAMPLE_FRACTION = 0.2;
const MIN_SAMPLES = 1;
const PATIENT_HISTORY_TABLE_COLUMNS = [
  { Header: "Task ID", accessor: "taskId", minWidth: 90 },
  { Header: "Date", accessor: "date", minWidth: 70 },
  {
    Header: "Total Amount",
    id: "totalAmount",
    accessor: (row: any) => formatCurrency(row.totalAmount),
    minWidth: 60
  },
  { Header: "Number of Claims", accessor: "claimCount", minWidth: 70 }
];

export interface TaskTotal {
  total: number;
  count: number;
  date: string;
}

type State = {
  searchTermDetails: string;
  showAllEntries: boolean;
  showImages: boolean;
  numPatients: number;
  patients: PatientInfo[];
  previousClaims: TaskTotal[];
};

interface PatientInfo {
  patientId: string;
  currentClaims: ClaimEntry[];
  history?: PatientHistory;
}

function getInitialState(props: DetailsComponentProps): State {
  const patients = getPatients(props.task.entries);
  return {
    searchTermDetails: "",
    showAllEntries: false,
    showImages: !!props.hideImagesDefault ? false : true,
    previousClaims: [],
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

  async componentDidMount() {
    this.props.registerActionCallback("approve", this._onApprove);
    this._loadPatientHistories();

    const previousClaims = await this._loadPreviousClaims(
      this.props.task.site.name
    );
    this.setState({ previousClaims });
  }

  _loadPreviousClaims = async (siteName: string) => {
    let tasks = await getPharmacyClaims(siteName);
    let previousClaims: TaskTotal[] = [];
    tasks.forEach(task => {
      if (task.id !== this.props.task.id) {
        let taskTotals = {
          id: task.id,
          total: 0,
          count: 0,
          date: new Date(task.entries[0].timestamp).toLocaleDateString()
        };

        task.entries.forEach(entry => {
          taskTotals.total += entry.claimedCost;
          taskTotals.count += 1;
        });
        taskTotals.total = parseFloat(taskTotals.total.toFixed(2));
        previousClaims.push(taskTotals);
      }
    });

    previousClaims.sort((a, b) => {
      return moment(a.date).isAfter(moment(b.date)) ? -1 : 1;
    });
    return previousClaims;
  };

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

  _loadPatientHistories = async () => {
    const histories = await getPatientHistories(
      this.state.patients.map(patient => patient.patientId)
    );
    this.setState({
      patients: this.state.patients.map(patient => ({
        ...patient,
        history: {
          tasks: histories[patient.patientId].tasks.filter(
            task => task.taskId !== this.props.task.id
          )
        }
      }))
    });
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
        label: { value: "Barcode", searchKey: "" }
      });
    }
    return claimImages;
  };

  _toggleRejectClaim = async (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    const claimIndex = event.currentTarget.getAttribute("data-value");
    if (!claimIndex) return;

    await setRejectedClaim(this.props.task, parseInt(claimIndex), checked);
    await this._loadPatientHistories();
  };

  _renderPatientDetails = (patient: PatientInfo) => {
    const { searchTermDetails, showImages } = this.state;
    const { task } = this.props;
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
        {patient.currentClaims.map((claim, index) => (
          <React.Fragment key={`${claim.totalCost}_${index}`}>
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
            <ClaimNotes
              claimIndex={(claim as any).originalIndex}
              task={task}
              notes={claim.notes || ""}
            />
            <CheckBox
              checked={claim.rejected === undefined ? false : claim.rejected}
              label={"Rejected: "}
              value={(claim as any).originalIndex}
              onCheckBoxSelect={this._toggleRejectClaim}
            />
          </React.Fragment>
        ))}

        {patient.history && patient.history.tasks.length > 0 && (
          <React.Fragment>
            <div>Previous claims from this patient:</div>
            <ReactTable
              data={patient.history.tasks}
              columns={PATIENT_HISTORY_TABLE_COLUMNS}
              minRows={0}
              showPagination={false}
            />
          </React.Fragment>
        )}
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
        <PharmacyInfo
          showImages={showImages}
          onToggleImages={this._toggleImages}
          previousClaims={this.state.previousClaims}
          site={task.site}
          claimCount={task.entries.length}
          showPreviousClaims={this.props.showPreviousClaims}
        />
        <div className="mainview_spaced_row">
          <input
            type="text"
            onChange={this._handleSearchTermDetailsChange}
            placeholder="Filter Claims"
          />
        </div>
        {patients.map(patient => {
          return this._renderPatientDetails(patient);
        })}
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
            .map(patient => {
              return this._renderPatientDetails(patient);
            })}
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
    (entry as any).originalIndex = index;
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
