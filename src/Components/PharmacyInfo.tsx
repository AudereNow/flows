import React from "react";
import { Pharmacy } from "../sharedtypes";
import {
  subscribeToPharmacyDetails,
  setPharmacyDetails
} from "../store/corestore";
import TextItem from "./TextItem";
import "./PharmacyInfo.css";

const DEFAULT_PHARMACY: Pharmacy = {
  opsOwners: []
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
  editing: boolean;
  saving: boolean;
  editedNotes?: string;
}
class PharmacyInfoHelper extends React.Component<Props, State> {
  state: State = {
    editing: false,
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
    this.setState({ editing: true, editedNotes: this.state.pharmacy.notes });
  };

  _onNotesSave = async () => {
    if (!this.state.pharmacy) {
      return;
    }
    this.setState({ saving: true });
    await setPharmacyDetails(this.props.name, {
      ...this.state.pharmacy,
      notes: this.state.editedNotes
    });
    this.setState({ editing: false, saving: false });
  };

  _onNotesChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({
      editedNotes: event.target.value
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
        {this.state.pharmacy &&
          (this.state.editing ? (
            <div className="pharmacy_detail">
              <div>Notes:</div>
              <textarea
                readOnly={this.state.saving}
                onChange={this._onNotesChange}
              >
                {this.state.pharmacy.notes}
              </textarea>
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
            <div className="pharmacy_detail">
              Notes: {this.state.pharmacy.notes}{" "}
              <button onClick={this._onNotesEdit}>Edit</button>
            </div>
          ))}
      </div>
    );
  }
}
