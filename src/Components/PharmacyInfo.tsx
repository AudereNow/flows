import React, { Fragment } from "react";
import ReactTable from "react-table";
import { TaskTotal } from "../Screens/AuditorPanel";
import { Pharmacy, Site } from "../sharedtypes";
import {
  setPharmacyDetails,
  subscribeToPharmacyDetails
} from "../store/corestore";
import Button from "./Button";
import ExpandableDiv from "./ExpandableDiv";
import "./PharmacyInfo.css";
import TextItem from "./TextItem";
import { ToolTipIcon } from "./ToolTipIcon";

const DEFAULT_PHARMACY: Pharmacy = {
  notes: "",
  owners: []
};

interface Props {
  site: Site;
  onToggleImages?: () => void;
  showImages?: boolean;
  previousClaims?: TaskTotal[];
  showPreviousClaims?: boolean;
  claimCount?: number;
}

interface State {
  pharmacy?: Pharmacy;
  editedNotes?: string;
  editedOwners?: string;
  saving: boolean;
}

const PREVIOUS_CLAIMS_TABLE_COLUMNS = [
  { id: "id", Header: "ID", accessor: "id", minWidth: 90 },
  { id: "total", Header: "Total", accessor: "total", minWidth: 70 },
  {
    id: "Count",
    Header: "Count",
    accessor: "count",
    minWidth: 60
  },
  {
    Header: "Date",
    id: "date",
    accessor: (row: any) => new Date(row.date).toLocaleDateString(),
    minWidth: 70
  }
];
class PharmacyInfo extends React.Component<Props, State> {
  state: State = {
    saving: false
  };

  _unsubscribe = () => {};

  componentDidMount() {
    this._unsubscribe = subscribeToPharmacyDetails(
      this.props.site.name,
      pharmacy => {
        if (pharmacy === undefined) {
          pharmacy = DEFAULT_PHARMACY;
        }
        this.setState({ pharmacy });
      }
    );
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.site.name !== this.props.site.name) {
      subscribeToPharmacyDetails(this.props.site.name, pharmacy => {
        if (pharmacy === undefined) {
          pharmacy = DEFAULT_PHARMACY;
        }
        this.setState({ pharmacy });
      });
    }
  }

  componentWillUnmount() {
    this._unsubscribe();
  }

  _onNotesEdit = () => {
    if (!this.state.pharmacy) {
      return;
    }
    this.setState({ editedNotes: this.state.pharmacy.notes });
  };

  _onNotesSave = async () => {
    if (!this.state.pharmacy) {
      return;
    }
    this.setState({ saving: true });
    await setPharmacyDetails(this.props.site.name, {
      ...this.state.pharmacy,
      notes: this.state.editedNotes || ""
    });
    this.setState({ editedNotes: undefined, saving: false });
  };

  _onNotesChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({
      editedNotes: event.target.value
    });
  };

  _onOwnersEdit = () => {
    if (!this.state.pharmacy) {
      return;
    }
    this.setState({ editedOwners: this.state.pharmacy.owners.join(", ") });
  };

  _onOwnersSave = async () => {
    if (!this.state.pharmacy) {
      return;
    }
    this.setState({ saving: true });
    await setPharmacyDetails(this.props.site.name, {
      ...this.state.pharmacy,
      owners: (this.state.editedOwners || "")
        .split(",")
        .map(owner => owner.trim())
        .filter(owner => owner)
    });
    this.setState({ editedOwners: undefined, saving: false });
  };

  _onOwnersChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      editedOwners: event.target.value
    });
  };

  render() {
    const { previousClaims, showPreviousClaims, claimCount } = this.props;
    const showIncreaseWarning =
      !!previousClaims && previousClaims.length > 0 && !!claimCount
        ? (claimCount - previousClaims[0]["count"]) /
            previousClaims[0]["count"] >
          0.5
        : false;
    return (
      <div className="pharmacy_container">
        <div className="pharmacy_half">
          <TextItem
            data={{
              displayKey: "Pharmacy",
              searchKey: "pharmacy",
              value: this.props.site.name || ""
            }}
          />
          <TextItem
            data={{
              displayKey: "Phone Number",
              searchKey: "pharmacy",
              value: this.props.site.phone || ""
            }}
          />
          {this.state.pharmacy && (
            <div className="pharmacy_detail">
              {this.state.editedNotes !== undefined ? (
                <div>
                  <div className="pharmacy_text">Notes:</div>
                  <textarea
                    className="pharmacy_textarea"
                    readOnly={this.state.saving}
                    onChange={this._onNotesChange}
                    defaultValue={this.state.editedNotes}
                  />
                  <div>
                    <Button
                      className="pharmacy_button"
                      onClick={this._onNotesSave}
                      disabled={this.state.saving}
                      label="Save"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="pharmacy_row">
                    <span className="pharmacy_text">Notes:</span>
                    <span className="pharmacy_left_space">
                      {this.state.pharmacy.notes}
                    </span>
                  </div>
                  <Button
                    className="pharmacy_button"
                    onClick={this._onNotesEdit}
                    label={
                      !!this.state.pharmacy.notes &&
                      this.state.pharmacy.notes.length > 0
                        ? "Edit"
                        : "Add Notes"
                    }
                  />
                </div>
              )}
              {this.state.editedOwners !== undefined ? (
                <div className="pharmacy_text">
                  {"Owners: "}
                  <input
                    readOnly={this.state.saving}
                    onChange={this._onOwnersChange}
                    defaultValue={this.state.editedOwners}
                  />
                  <Button
                    className="pharmacy_button"
                    onClick={this._onOwnersSave}
                    disabled={this.state.saving}
                    label="Save"
                  />
                  <span className="pharmacy_helptext">
                    {" (Enter email addresses of owners, separated by commas)"}
                  </span>
                </div>
              ) : (
                <div>
                  <div className="pharmacy_row">
                    <span className="pharmacy_text">Owners:</span>
                    <span className="pharmacy_left_space">
                      {this.state.pharmacy.owners.join(",")}
                    </span>
                  </div>
                  <Button
                    className="pharmacy_button"
                    onClick={this._onOwnersEdit}
                    label={
                      this.state.pharmacy.owners.length > 0
                        ? "Edit"
                        : "Add Owners"
                    }
                  />
                </div>
              )}
              {this.props.children}
            </div>
          )}
        </div>
        <div className="pharmacy_half">
          {!!previousClaims && !!showPreviousClaims && (
            <ExpandableDiv label="Previous Pharmacy Claims">
              <Fragment>
                <div className="pharmacy_row">
                  {!!showIncreaseWarning && (
                    <ToolTipIcon
                      label={"⚠"}
                      tooltip="Greater than 50% increase in claims. Please check for possible fraud"
                    ></ToolTipIcon>
                  )}
                </div>
                <ReactTable
                  className="-striped -highlight"
                  data={previousClaims}
                  columns={PREVIOUS_CLAIMS_TABLE_COLUMNS}
                  minRows={0}
                  showPagination={false}
                />
              </Fragment>
            </ExpandableDiv>
          )}
        </div>
      </div>
    );
  }
}

export default PharmacyInfo;
