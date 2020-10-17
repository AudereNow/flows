import "./ClaimNotes.css";

import React, { ChangeEvent, Fragment } from "react";

import Button from "./Button";
import { Task } from "../sharedtypes";
import { dataStore } from "../transport/datastore";

interface Props {
  claimIndex: number;
  task: Task;
  notes: string[];
  cannedNotes: string[];
}

interface State {
  newNote: string;
  editing: boolean;
  cannedClaimNotes?: string[];
}

class ClaimNotes extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      newNote: "",
      editing: false,
    };
  }

  async componentDidMount() {
    this.setState({
      cannedClaimNotes: [
        ...(await dataStore.getNotes("claim")),
        ...this.props.cannedNotes,
      ],
    });
  }

  _onSave = async () => {
    const { newNote } = this.state;
    const { claimIndex, task } = this.props;
    await dataStore.setClaimNotes(task, claimIndex, newNote);
    this.setState({ editing: false });
  };

  _onEdit = () => {
    this.setState({ editing: true });
  };

  _onNotesChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ newNote: event.currentTarget.value });
  };

  _onCannedNoteSelected = (event: ChangeEvent<HTMLSelectElement>) => {
    const { newNote } = this.state;
    this.setState({
      newNote: newNote + (newNote ? "\n" : "") + event.target.value,
    });
  };

  render() {
    const { newNote, editing, cannedClaimNotes } = this.state;
    return (
      <div>
        {this.props.notes.length > 0 && (
          <>
            <div>Notes:</div>
            <>
              {this.props.notes.map((note: string) =>
                note.split("\n").map(line => <div>{line}</div>)
              )}
            </>
          </>
        )}
        {editing ? (
          <div className="claimnotes_row">
            <textarea
              className="claimnotes_textarea"
              onChange={this._onNotesChange}
              value={newNote}
            />
            <Button
              className="claimnotes_button"
              label="Save Notes"
              onClick={this._onSave}
            />
            {cannedClaimNotes && cannedClaimNotes.length > 0 && (
              <div>
                <select onChange={this._onCannedNoteSelected}>
                  <option value="">--Canned Responses--</option>
                  {cannedClaimNotes.map(cannedNote => (
                    <option key={cannedNote} value={cannedNote}>
                      {cannedNote}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          <Button
            className="claimnotes_button"
            label="Add Note"
            onClick={this._onEdit}
          />
        )}
      </div>
    );
  }
}

export default ClaimNotes;
