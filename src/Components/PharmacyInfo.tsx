import React from "react";
import { Pharmacy } from "../sharedtypes";
import {
  setPharmacyDetails,
  subscribeToPharmacyDetails
} from "../store/corestore";
import Button from "./Button";
import "./PharmacyInfo.css";
import TextItem from "./TextItem";

const DEFAULT_PHARMACY: Pharmacy = {
  opsOwners: []
};

interface Props {
  name: string;
  onToggleImages: () => void;
  showImages: boolean;
}

interface State {
  pharmacy?: Pharmacy;
  editing: boolean;
  saving: boolean;
  editedNotes?: string;
}
class PharmacyInfo extends React.Component<Props, State> {
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
      <div className="pharmacy_container">
        <TextItem
          data={{
            displayKey: "Pharmacy",
            searchKey: "name",
            value: this.props.name
          }}
        />
        {this.state.pharmacy &&
          (this.state.editing ? (
            <div>
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
              {`Notes: ${this.state.pharmacy.notes || ""} `}
              <button onClick={this._onNotesEdit}>Edit</button>
            </div>
          ))}
        <div className="pharmacy_toggle_image_container">
          <Button
            onClick={this.props.onToggleImages}
            label={!!this.props.showImages ? "Hide Images" : "Show Images"}
          />
        </div>
      </div>
    );
  }
}

export default PharmacyInfo;
