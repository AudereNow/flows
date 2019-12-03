import { json2csv } from "json-2-csv";
import moment from "moment";
import React from "react";
import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import ReactTable from "react-table";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import ImageRow from "../Components/ImageRow";
import LabelWrapper from "../Components/LabelWrapper";
import PharmacyInfo from "../Components/PharmacyInfo";
import TextItem, { SearchContext } from "../Components/TextItem";
import { ClaimEntry } from "../sharedtypes";
import {
  formatCurrency,
  getPatientHistories,
  getPharmacyClaims,
  PatientHistory
} from "../store/corestore";
import debounce from "../util/debounce";
import { containsSearchTerm } from "../util/search";
import "./MainView.css";
import { DetailsComponentProps } from "./TaskPanel";

const MIN_SAMPLE_FRACTION = 0.2;
const MIN_SAMPLES = 1;
const PATIENT_HISTORY_TABLE_COLUMNS = [
  { Header: "ID", accessor: "taskId", minWidth: 90 },
  { Header: "DATE", accessor: "date", minWidth: 70 },
  {
    Header: "TOTAL AMOUNT",
    id: "totalAmount",
    accessor: (row: any) => formatCurrency(row.totalAmount),
    minWidth: 60
  },
  { Header: "NUMBER OF CLAIMS", accessor: "claimCount", minWidth: 70 }
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

  _renderPatientDetails = (patient: PatientInfo, index: number) => {
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
    const disabledCheckbox =
      task.state === "REJECTED" || "COMPLETED" ? true : false;

    if (
      !!searchTermDetails &&
      !containsSearchTerm(searchTermDetails, checkEntry)
    ) {
      return null;
    }

    return (
      <LabelWrapper key={JSON.stringify(entry + "_" + index)}>
        <div className="mainview_padded">
          <div className="mainview_row">
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
            </React.Fragment>
          ))}
          {patient.history && patient.history.tasks.length > 0 && (
            <React.Fragment>
              <div className="mainview_padded_row mainview_bold">
                Previous Patient Claims:
              </div>
              <ReactTable
                className="-striped -highlight"
                data={patient.history.tasks}
                columns={PATIENT_HISTORY_TABLE_COLUMNS}
                minRows={0}
                showPagination={false}
              />
            </React.Fragment>
          )}
        </div>
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

  _downloadPharmacyReport = () => {
    const { task } = this.props;

    let rows: any[] = [];

    task.entries.forEach(entry => {
      rows.push({
        date: new Date(entry.timestamp).toLocaleDateString(),
        first: entry.patientFirstName,
        last: entry.patientLastName,
        id: entry.patientID,
        sex: entry.patientSex,
        phone: entry.phone,
        item: entry.item,
        "claimed cost": entry.claimedCost,
        notes: (entry as any).notes || "",
        rejected: (entry as any).rejected || false
      });
    });

    json2csv(rows, (err, csv) => {
      if (!csv || err) {
        alert("Something went wrong when trying to download your csv");
      }

      const dataString = "data:text/csv;charset=utf-8," + csv;
      const encodedURI = encodeURI(dataString);
      const link = document.createElement("a");
      link.setAttribute("href", encodedURI);
      link.setAttribute("download", `${task.site.name}.csv`);
      link.click();
    });
  };

  render() {
    const { searchTermGlobal } = this.context;
    const showAllEntries = !!searchTermGlobal || this.state.showAllEntries;
    const { task } = this.props;
    const { showImages } = this.state;
    const patients = getPatients(task.entries).slice(0, this.state.numPatients);
    const remaining = this.state.patients.length - this.state.numPatients;

    return (
      <LabelWrapper key={searchTermGlobal} className="mainview_details">
        <PharmacyInfo
          showImages={showImages}
          onToggleImages={this._toggleImages}
          previousClaims={this.state.previousClaims}
          site={task.site}
          claimCount={task.entries.length}
          showPreviousClaims={this.props.showPreviousClaims}
        />
        <Button
          label="Download Pharmacy Report"
          onClick={this._downloadPharmacyReport}
        />
        <div className="mainview_spaced_row">
          <input
            className="mainview_search_input"
            type="text"
            onChange={this._handleSearchTermDetailsChange}
            placeholder="Filter Claims"
          />
        </div>
        {patients.map((patient, index) => {
          return this._renderPatientDetails(patient, index);
        })}
        {remaining > 0 && (
          <div className="mainview_button_row">
            <Button
              className="mainview_show_more_button"
              label={
                showAllEntries
                  ? `- Hide ${remaining} Additional Claims`
                  : `+ Show ${remaining} Additional Claims`
              }
              onClick={this._onShowAll}
            />
          </div>
        )}
        {remaining > 0 &&
          showAllEntries &&
          this.state.patients
            .slice(this.state.numPatients, task.entries.length)

            .map((patient, index) => {
              return this._renderPatientDetails(patient, index);
            })}

        {this.props.notesux}
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
