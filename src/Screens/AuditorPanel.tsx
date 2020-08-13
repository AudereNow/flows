import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import "react-tabs/style/react-tabs.css";
import "./MainView.css";

import { ClaimEntry, Task } from "../sharedtypes";
import { PatientHistory, dataStore } from "../transport/datastore";
import TextItem, { SearchContext } from "../Components/TextItem";

import Button from "../Components/Button";
import CheckBox from "../Components/CheckBox";
import ClaimNotes from "../Components/ClaimNotes";
import { DetailsComponentProps } from "./TaskPanel";
import DownloadCSVImg from "../assets/downloadcsv.png";
import ImageRow from "../Components/ImageRow";
import LabelWrapper from "../Components/LabelWrapper";
import PharmacyInfo from "../Components/PharmacyInfo";
import React from "react";
import ReactTable from "react-table";
import { containsSearchTerm } from "../util/search";
import debounce from "../util/debounce";
import { json2csv } from "json-2-csv";
import moment from "moment";

const MIN_SAMPLE_FRACTION = 0.2;
const MIN_SAMPLES = 1;
const PATIENT_HISTORY_TABLE_COLUMNS = [
  { Header: "ID", accessor: "taskId", minWidth: 90 },
  { Header: "DATE", accessor: "date", minWidth: 70 },

  {
    Header: "TOTAL AMOUNT",
    id: "totalAmount",
    accessor: (row: any) =>
      dataStore.formatCurrency(parseFloat(row.totalAmount)),
    minWidth: 60,
  },
  { Header: "NUMBER OF CLAIMS", accessor: "claimCount", minWidth: 70 },
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
  currentClaims: {
    taskIndex: number;
    claims: ClaimEntry[];
  }[];
  history?: PatientHistory;
}

function getInitialState(props: DetailsComponentProps): State {
  const patients = getPatients(props.tasks);
  return {
    searchTermDetails: "",
    showAllEntries: false,
    showImages: !!props.hideImagesDefault ? false : true,
    previousClaims: [],
    numPatients: Math.max(
      Math.ceil(patients.length * MIN_SAMPLE_FRACTION),
      MIN_SAMPLES
    ),
    patients,
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
    this.props.registerActionCallback("save", this._onApprove);
    this._loadPatientHistories();

    const previousClaims = await this._loadPreviousClaims(
      this.props.tasks[0].site.name
    );
    this.setState({ previousClaims });
  }

  _loadPreviousClaims = async (siteName: string) => {
    let tasks = await dataStore.getPharmacyClaims(siteName);
    let previousClaims: TaskTotal[] = [];
    tasks.forEach(task => {
      if (this.props.tasks.every(currentTask => task.id !== currentTask.id)) {
        let taskTotals = {
          id: task.id,
          total: 0,
          count: 0,
          date: new Date(task.entries[0].timestamp).toLocaleDateString(),
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
    const tasks = this.props.tasks.map(task => ({
      ...task,
      entries: task.entries.map((entry, index) => {
        const patientIndex = this.state.patients.findIndex(
          patient => patient.patientId === entry.patientID
        );
        if (
          (patientIndex !== -1 && patientIndex < this.state.numPatients) ||
          this.state.showAllEntries
        ) {
          return {
            ...entry,
            reviewed: true,
          };
        }
        return entry;
      }),
    }));
    return { success: true, tasks };
  };

  _loadPatientHistories = async () => {
    const histories = await dataStore.getPatientHistories(
      this.state.patients.map(patient => patient.patientId)
    );
    this.setState({
      patients: this.state.patients.map(patient => ({
        ...patient,
        history: {
          tasks: histories[patient.patientId].tasks.filter(task =>
            this.props.tasks.every(
              currentTask => task.taskId !== currentTask.id
            )
          ),
        },
      })),
    });
  };

  _extractImages = (claim: ClaimEntry) => {
    const claimImages = [];
    if (!!claim.photoMedUri) {
      claimImages.push({
        url: claim.photoMedUri,
        label: { value: claim.item, searchKey: "item" },
      });
    }
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
        label: { value: "Barcode", searchKey: "" },
      });
    }
    return claimImages;
  };

  _toggleRejectClaim = async (value: string, checked: boolean) => {
    const { taskIndex, claimIndex } = JSON.parse(value || "");
    await dataStore.setRejectedClaim(
      this.props.tasks[taskIndex],
      claimIndex,
      checked
    );
  };

  _renderPatientDetails = (patient: PatientInfo, index: number) => {
    const { searchTermDetails, showImages } = this.state;
    const { tasks } = this.props;
    let patientProps = [];
    const entry = patient.currentClaims[0].claims[0];
    const disabledCheckbox =
      tasks[0].state === "REJECTED" || tasks[0].state === "COMPLETED"
        ? true
        : false;
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
      <LabelWrapper key={JSON.stringify(entry + "_" + index)}>
        <div className="mainview_padded">
          <div className="mainview_row">
            <TextItem
              data={{
                displayKey: "Patient",
                searchKey: "patient",
                value: patientString,
              }}
            />
          </div>
          {patient.currentClaims.map((task, taskIndex) =>
            task.claims.map((claim, index) => (
              <React.Fragment key={`${claim.totalCost}_${index}`}>
                <TextItem
                  data={{
                    displayKey: "Date",
                    searchKey: "date",
                    value: new Date(claim.timestamp).toLocaleDateString(),
                  }}
                />
                <ImageRow
                  showImages={showImages}
                  images={this._extractImages(claim)}
                />
                <CheckBox
                  checked={
                    claim.rejected === undefined ? false : claim.rejected
                  }
                  label={"Rejected"}
                  value={JSON.stringify({
                    claimIndex: (claim as any).originalIndex,
                    taskIndex,
                  })}
                  onCheckBoxSelect={this._toggleRejectClaim}
                  disabled={disabledCheckbox}
                  key={index}
                />
                <ClaimNotes
                  claimIndex={(claim as any).originalIndex}
                  task={this.props.tasks[task.taskIndex]}
                  notes={claim.notes || ""}
                />
              </React.Fragment>
            ))
          )}

          {patient.history && patient.history.tasks.length > 0 && (
            <React.Fragment>
              <div className="mainview_padded_row mainview_bold mainview_header_text">
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
    const { tasks } = this.props;

    let rows: any[] = [];

    tasks.forEach(task =>
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
          rejected: (entry as any).rejected || false,
          notes: (entry as any).notes || "",
        });
      })
    );

    json2csv(rows, (err, csv) => {
      if (!csv || err) {
        alert("Something went wrong when trying to download your csv");
      }

      const dataString = "data:text/csv;charset=utf-8," + csv;
      const encodedURI = encodeURI(dataString);
      const link = document.createElement("a");
      link.setAttribute("href", encodedURI);
      link.setAttribute("download", `${tasks[0].site.name}.csv`);
      link.click();
    });
  };

  render() {
    const { searchTermGlobal } = this.context;
    const showAllEntries = !!searchTermGlobal || this.state.showAllEntries;
    const { tasks } = this.props;
    const { showImages } = this.state;
    const patients = getPatients(tasks).slice(0, this.state.numPatients);
    const remaining = this.state.patients.length - this.state.numPatients;

    return (
      <LabelWrapper key={searchTermGlobal} className="mainview_details">
        <PharmacyInfo
          showImages={showImages}
          onToggleImages={this._toggleImages}
          previousClaims={this.state.previousClaims}
          site={tasks[0].site}
          claimCount={tasks
            .map(task => task.entries.length)
            .reduce((a, b) => a + b, 0)}
          showPreviousClaims={this.props.showPreviousClaims}
        />
        <Button
          className="mainview_button"
          label="Download Pharmacy Report"
          labelImg={DownloadCSVImg}
          onClick={this._downloadPharmacyReport}
        />
        <div className="mainview_row">
          <input
            className="mainview_search_input"
            type="text"
            onChange={this._handleSearchTermDetailsChange}
            placeholder="Filter Claims"
          />
          {tasks.some(task => !!(task as any).foundCount) && (
            <span className="mainview_header_text">{`Search Results: (${tasks
              .map(task => (task as any).foundCount)
              .reduce((a, b) => a + b, 0)})`}</span>
          )}
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
            .slice(this.state.numPatients)

            .map((patient, index) => {
              return this._renderPatientDetails(patient, index);
            })}

        {this.props.notesux}
        {this.props.children}
      </LabelWrapper>
    );
  }
}

function getPatients(tasks: Task[]): PatientInfo[] {
  const entriesByPatient: { [id: string]: PatientInfo } = {};
  tasks.forEach((task, taskIndex) =>
    task.entries.forEach((entry, index) => {
      const id = entry.patientID || `Patient ${index}`;
      (entry as any).originalIndex = index;
      if (entriesByPatient[id]) {
        const taskGroup = entriesByPatient[id].currentClaims.find(
          entry => entry.taskIndex === taskIndex
        );
        if (taskGroup) {
          taskGroup.claims.push(entry);
        } else {
          entriesByPatient[id].currentClaims.push({
            taskIndex,
            claims: [entry],
          });
        }
      } else {
        entriesByPatient[id] = {
          patientId: id,
          currentClaims: [
            {
              taskIndex,
              claims: [entry],
            },
          ],
        };
      }
    })
  );
  return Object.values(entriesByPatient).sort(
    (a, b) => b.currentClaims.length - a.currentClaims.length
  );
}
