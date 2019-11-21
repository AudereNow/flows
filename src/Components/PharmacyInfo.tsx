import React, { Fragment } from "react";
import { TaskTotal } from "../Screens/AuditorPanel";
import { Pharmacy } from "../sharedtypes";
import {
  setPharmacyDetails,
  subscribeToPharmacyDetails
} from "../store/corestore";
import Button from "./Button";
import DataTable from "./DataTable";
import "./PharmacyInfo.css";
import TextItem from "./TextItem";
import { ToolTipIcon } from "./ToolTipIcon";

const DEFAULT_PHARMACY: Pharmacy = {
  notes: "",
  owners: []
};

interface Props {
  name: string;
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
class PharmacyInfo extends React.Component<Props, State> {
  state: State = {
    saving: false
  };

  _unsubscribe = () => {};

  componentDidMount() {
    this._unsubscribe = subscribeToPharmacyDetails(
      this.props.name,
      pharmacy => {
        if (pharmacy === undefined) {
          pharmacy = DEFAULT_PHARMACY;
        }
        this.setState({ pharmacy });
      }
    );
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.name !== this.props.name) {
      subscribeToPharmacyDetails(this.props.name, pharmacy => {
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
    await setPharmacyDetails(this.props.name, {
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
    await setPharmacyDetails(this.props.name, {
      ...this.state.pharmacy,
      owners: (this.state.editedOwners || "")
        .split(",")
        .map(owner => owner.trim())
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
              searchKey: "name",
              value: this.props.name
            }}
          />
          {this.state.pharmacy && (
            <div className="pharmacy_detail">
              {this.state.editedNotes !== undefined ? (
                <div>
                  <div>Notes:</div>
                  <textarea
                    readOnly={this.state.saving}
                    onChange={this._onNotesChange}
                    defaultValue={this.state.editedNotes}
                  />
                  <div>
                    <Button
                      onClick={this._onNotesSave}
                      disabled={this.state.saving}
                      label="Save"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div>
                    {`Notes: ${this.state.pharmacy.notes} `}
                    <Button
                      onClick={this._onNotesEdit}
                      label={
                        !!this.state.pharmacy.notes &&
                        this.state.pharmacy.notes.length > 0
                          ? "Edit"
                          : "Add Notes"
                      }
                    />
                  </div>
                </div>
              )}
              {this.state.editedOwners !== undefined ? (
                <div>
                  {"Owners: "}
                  <input
                    readOnly={this.state.saving}
                    onChange={this._onOwnersChange}
                    defaultValue={this.state.editedOwners}
                  />
                  <Button
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
                  {`Owners: ${this.state.pharmacy.owners.join(", ")} `}
                  <Button
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
            <Fragment>
              <div className="pharmacy_claims_header">
                <span className="pharmacy_claims_header_text">
                  Previous Claims
                </span>
                {!!showIncreaseWarning && (
                  <ToolTipIcon
                    label={"⚠"}
                    tooltip="Greater than 50% increase in claims. Please check for possible fraud"
                  ></ToolTipIcon>
                )}
              </div>
              <DataTable data={previousClaims} />
            </Fragment>
          )}
        </div>
      </div>
    );
  }
}

export default PharmacyInfo;
