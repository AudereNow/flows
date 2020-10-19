import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import "react-tabs/style/react-tabs.css";
import "./MainView.css";
import "./AuditorPanel.css";

import { ClaimAction, DetailsComponentProps } from "./TaskPanel";
import { ClaimEntry, Task, TaskState } from "../sharedtypes";
import { DataStoreType, defaultConfig } from "../store/config";
import { Flag, PatientHistory } from "../transport/baseDatastore";
import TextItem, { SearchContext } from "../Components/TextItem";

import Button from "../Components/Button";
import CheckBox from "../Components/CheckBox";
import ClaimNotes from "../Components/ClaimNotes";
import DownloadCSVImg from "../assets/downloadcsv.png";
import ImageRow from "../Components/ImageRow";
import LabelWrapper from "../Components/LabelWrapper";
import PharmacyInfo from "../Components/PharmacyInfo";
import React from "react";
import ReactTable from "react-table";
import { containsSearchTerm } from "../util/search";
import { dataStore } from "../transport/datastore";
import debounce from "../util/debounce";
import { formatCurrency } from "../util/currency";
import { json2csv } from "json-2-csv";
import moment from "moment";

const SAMPLES_PER_PAGE = 25;
const MIN_SAMPLE_FRACTION = 0.2;
const MIN_SAMPLES = 1;
const PATIENT_HISTORY_TABLE_COLUMNS = [
  { Header: "ID", accessor: "taskId", minWidth: 90 },
  { Header: "DATE", accessor: "date", minWidth: 70 },

  {
    Header: "TOTAL AMOUNT",
    id: "totalAmount",
    accessor: (row: any) => formatCurrency(parseFloat(row.totalAmount)),
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
  pageNumber: number;
};

interface PatientInfo {
  patientId: string;
  currentClaims: {
    taskIndex: number;
    claims: ClaimEntry[];
  }[];
  history?: PatientHistory;
}

type LabeledPhoto = {
  url: string;
  label: {
    displayKey?: string;
    value: string;
    searchKey: string;
  };
};

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
    pageNumber: 0,
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
          date: new Date(task.entries[0].startTime).toLocaleDateString(),
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
      patients: this.state.patients.map(patient => {
        const history = histories[patient.patientId];
        return {
          ...patient,
          history: {
            tasks: history
              ? history.tasks.filter(task =>
                  this.props.tasks.every(
                    currentTask => task.taskId !== currentTask.id
                  )
                )
              : [],
          },
        };
      }),
    });
  };

  _extractImages = (claim: ClaimEntry): LabeledPhoto[] => {
    const claimImages: LabeledPhoto[] = claim.photos
      ? claim.photos.map(({ url, caption }) => ({
          url,
          label: { value: caption || "", searchKey: "item" },
        }))
      : [];
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

  _updateClaimAction = (value: string, checked: boolean) => {
    const {
      claimId,
      claimAction,
    }: { claimId: string; claimAction: ClaimAction } = JSON.parse(value);
    this.props.updateSelectedAction(claimId, {
      action: checked ? claimAction : undefined,
    });
  };

  _updateFlag = (value: string, checked: boolean) => {
    const {
      claimId,
    }: { claimId: string; claimAction: ClaimAction } = JSON.parse(value);
    this.props.updateSelectedAction(claimId, { flag: checked });
  };

  _renderPatientDetails = (patient: PatientInfo, index: number) => {
    const { searchTermDetails, showImages } = this.state;
    const { tasks } = this.props;
    let patientProps = [];
    const entry = patient.currentClaims[0].claims[0];
    const flags: Flag[] = patient.currentClaims
      .map(group => group.claims.map(claim => this.props.flags[claim.claimID!]))
      .flat(2)
      .filter(flag => flag);
    const disabledCheckbox =
      tasks[0].state === TaskState.REJECTED ||
      tasks[0].state === TaskState.COMPLETED
        ? true
        : false;
    if (!!entry.patientAge) patientProps.push(entry.patientAge);
    if (!!entry.patientSex && entry.patientSex!.length > 0)
      patientProps.push(entry.patientSex);
    const patientInfo =
      patientProps.length > 0 ? `(${patientProps.join(", ")})` : "";

    const patientString = `${entry.patientFirstName} ${entry.patientLastName} ${patientInfo}`;
    const patientPhone = entry.phone || "Check ID";

    let checkEntry = Object.assign({}, entry, patient);

    if (
      !!searchTermDetails &&
      !containsSearchTerm(searchTermDetails, checkEntry)
    ) {
      return null;
    }

    return (
      <LabelWrapper
        key={JSON.stringify("entry_" + patient.patientId)}
        disableScroll={true}
      >
        <div className="mainview_padded">
          {flags.length > 0 && (
            <div className="mainview_row mainview_flag_box">
              <strong>{flags.map(flag => flag.description).join(", ")}</strong>
            </div>
          )}
          <div className="mainview_row">
            <TextItem
              data={{
                displayKey: "Patient",
                searchKey: "patient",
                value: patientString,
              }}
            />
          </div>
          <div className="mainview_row">
            <TextItem
              data={{
                displayKey: "Phone",
                searchKey: "phone",
                value: patientPhone,
              }}
            />
          </div>
          {patient.currentClaims.map((task, taskIndex) =>
            task.claims.map((claim, claimIndex) => (
              <React.Fragment key={`${index}_${taskIndex}_${claimIndex}`}>
                <TextItem
                  data={{
                    displayKey: "Date",
                    searchKey: "date",
                    value: getDateString(claim),
                  }}
                />
                <ImageRow
                  showImages={showImages}
                  images={this._extractImages(claim)}
                />
                {claim.items.map((item, itemIndex) => (
                  <React.Fragment key={item.name + itemIndex}>
                    <TextItem
                      data={{
                        displayKey: "Item",
                        searchKey: "item",
                        value: item.name,
                      }}
                    />
                    {item.photoUrl && (
                      <ImageRow
                        showImages={showImages}
                        images={[item.photoUrl]}
                      />
                    )}
                  </React.Fragment>
                ))}
                {this.props.taskConfig.showFlagForReview && (
                  <CheckBox
                    checked={
                      this.props.selectedActions[claim.claimID] &&
                      this.props.selectedActions[claim.claimID].flag
                    }
                    label={this.props.taskConfig.showFlagForReview}
                    value={JSON.stringify({ claimId: claim.claimID })}
                    onCheckBoxSelect={this._updateFlag}
                    disabled={disabledCheckbox}
                  />
                )}
                <div className="claim_options_container">
                  <CheckBox
                    checked={
                      this.props.selectedActions[claim.claimID] &&
                      this.props.selectedActions[claim.claimID].action ===
                        ClaimAction.APPROVE
                    }
                    label={"Approve"}
                    value={JSON.stringify({
                      claimAction: ClaimAction.APPROVE,
                      claimId: claim.claimID,
                    })}
                    onCheckBoxSelect={this._updateClaimAction}
                    disabled={disabledCheckbox}
                    radio={true}
                    className="claim_option"
                  />
                  <CheckBox
                    checked={
                      this.props.selectedActions[claim.claimID] &&
                      this.props.selectedActions[claim.claimID].action ===
                        ClaimAction.HOLD
                    }
                    label={"Hold"}
                    value={JSON.stringify({
                      claimAction: ClaimAction.HOLD,
                      claimId: claim.claimID,
                    })}
                    onCheckBoxSelect={this._updateClaimAction}
                    disabled={disabledCheckbox}
                    radio={true}
                    className="claim_option"
                  />
                  <CheckBox
                    checked={
                      this.props.selectedActions[claim.claimID] &&
                      this.props.selectedActions[claim.claimID].action ===
                        ClaimAction.REJECT
                    }
                    label={"Reject"}
                    value={JSON.stringify({
                      claimAction: ClaimAction.REJECT,
                      claimId: claim.claimID,
                    })}
                    onCheckBoxSelect={this._updateClaimAction}
                    disabled={disabledCheckbox}
                    radio={true}
                    className="claim_option"
                  />
                </div>
                <ClaimNotes
                  claimIndex={(claim as any).originalIndex}
                  task={this.props.tasks[task.taskIndex]}
                  notes={claim.notes || []}
                  cannedNotes={this.props.taskConfig.cannedResponses || []}
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
          date: new Date(entry.startTime).toLocaleDateString(),
          first: entry.patientFirstName,
          last: entry.patientLastName,
          id: entry.patientID,
          sex: entry.patientSex,
          phone: entry.phone,
          item: "",
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

  _previousPage = () => {
    this.setState({
      pageNumber: this.state.pageNumber - 1,
    });
  };

  _nextPage = () => {
    this.setState({
      pageNumber: this.state.pageNumber + 1,
    });
  };

  _renderPageButtons() {
    const pages = Math.ceil(this.props.tasks.length / SAMPLES_PER_PAGE);
    if (pages === 1) {
      return null;
    }
    return (
      <div className="auditor_pageButtons">
        <button
          disabled={this.state.pageNumber === 0}
          onClick={this._previousPage}
          className="mainview_button"
        >
          ‹ Previous
        </button>
        <div className="auditor_pageNumber">
          Page {this.state.pageNumber + 1} of {pages}
        </div>
        <button
          disabled={this.state.pageNumber === pages - 1}
          onClick={this._nextPage}
          className="mainview_button"
        >
          Next ›
        </button>
      </div>
    );
  }

  render() {
    const { searchTermGlobal } = this.context;
    const { tasks } = this.props;
    const { showImages } = this.state;
    const patients = getPatients(tasks);
    const showPharmacyHistory =
      defaultConfig.dataStore.type === DataStoreType.FIREBASE;

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
        {showPharmacyHistory && (
          <Button
            className="mainview_button"
            label="Download Pharmacy Report"
            labelImg={DownloadCSVImg}
            onClick={this._downloadPharmacyReport}
          />
        )}
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
        {this._renderPageButtons()}
        {patients
          .slice(
            this.state.pageNumber * SAMPLES_PER_PAGE,
            (this.state.pageNumber + 1) * SAMPLES_PER_PAGE
          )
          .map((patient, index) => {
            return this._renderPatientDetails(
              patient,
              this.state.pageNumber * SAMPLES_PER_PAGE + index
            );
          })}
        {this._renderPageButtons()}
        {this.props.notesux}
        {this.props.children}
      </LabelWrapper>
    );
  }
}

function getPatients(tasks: Task[]): PatientInfo[] {
  return tasks.map((task, index) => ({
    patientId: task.entries[0].patientID || "",
    currentClaims: [
      {
        taskIndex: index,
        claims: task.entries,
      },
    ],
  }));
}

function getDateString(claim: ClaimEntry): string {
  const startDate = moment(claim.startTime).format("MMM DD");
  const endDate = moment(claim.endTime).format("MMM DD");
  const startTime = new Date(claim.startTime).toLocaleTimeString();
  const endTime = new Date(claim.endTime).toLocaleTimeString();
  if (startDate === endDate) {
    return `${startDate} ${startTime} - ${endTime}`;
  } else {
    return `${startDate} ${startTime} - ${endDate} ${endTime}`;
  }
}
