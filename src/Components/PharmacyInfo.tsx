import React from "react";
import { Pharmacy } from "../sharedtypes";
import {
  subscribeToPharmacyDetails,
  setPharmacyDetails
} from "../store/corestore";
import TextItem from "./TextItem";
import "./PharmacyInfo.css";

const DEFAULT_PHARMACY: Pharmacy = {
  notes: "",
  owners: []
};

interface Props {
  name: string;
}

export class PharmacyInfo extends React.Component<Props> {
  render() {
    return <PharmacyInfoHelper name={this.props.name} key={this.props.name} />;
  }
}

interface State {
  pharmacy?: Pharmacy;
  editedNotes?: string;
  editedOwners?: string;
  saving: boolean;
}
class PharmacyInfoHelper extends React.Component<Props, State> {
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
      <div>
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
                  <button
                    onClick={this._onNotesSave}
                    disabled={this.state.saving}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div>
                  {`Notes: ${this.state.pharmacy.notes} `}
                  <button onClick={this._onNotesEdit}>
                    {this.state.pharmacy.notes.length > 0
                      ? "Edit"
                      : "Add Notes"}
                  </button>
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
                <button
                  onClick={this._onOwnersSave}
                  disabled={this.state.saving}
                >
                  Save
                </button>
                <span className="pharmacy_helptext">
                  {" (Enter email addresses of owners, separated by commas)"}
                </span>
              </div>
            ) : (
              <div>
                {`Owners: ${this.state.pharmacy.owners.join(", ")} `}
                <button onClick={this._onOwnersEdit}>
                  {this.state.pharmacy.owners.length > 0
                    ? "Edit"
                    : "Add Owners"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}
