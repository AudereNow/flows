import React from "react";
import Button from "./Button";
import { Pharmacy } from "../sharedtypes";
import {
  setPharmacyDetails,
  subscribeToPharmacyDetails
} from "../store/corestore";
import "./PharmacyInfo.css";
import TextItem from "./TextItem";

const DEFAULT_PHARMACY: Pharmacy = {
  notes: "",
  owners: []
};

interface Props {
  name: string;
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

  componentDidMount() {
    subscribeToPharmacyDetails(this.props.name, pharmacy => {
      if (pharmacy === undefined) {
        pharmacy = DEFAULT_PHARMACY;
      }
      this.setState({ pharmacy });
    });
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
    return (
      <div className="pharmacy_container">
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
    );
  }
}

export default PharmacyInfo;
