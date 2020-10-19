import "./ClaimNotes.css";

import React, { ChangeEvent, Fragment } from "react";

import Button from "./Button";
import { Task } from "../sharedtypes";
import { dataStore } from "../transport/datastore";

interface Props {
  claimIndex: number;
  task: Task;
  notes: string;
  cannedNotes: string[];
}

interface State {
  notes: string;
  editing: boolean;
  cannedClaimNotes?: string[];
}

class ClaimNotes extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      notes: props.notes,
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
    const { notes } = this.state;
    const { claimIndex, task } = this.props;
    await dataStore.setClaimNotes(task, claimIndex, notes);
    this.setState({ editing: false });
  };

  _onEdit = () => {
    this.setState({ editing: true });
  };

  _onNotesChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ notes: event.currentTarget.value });
  };

  _onCannedNoteSelected = (event: ChangeEvent<HTMLSelectElement>) => {
    const { notes } = this.state;
    this.setState({ notes: notes + (notes ? "\n" : "") + event.target.value });
  };

  render() {
    const { notes, editing, cannedClaimNotes } = this.state;
    return (
      <div className="claimnotes_row">
        {editing ? (
          <Fragment>
            <textarea
              className="claimnotes_textarea"
              onChange={this._onNotesChange}
              value={notes}
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
          </Fragment>
        ) : (
          <Fragment>
            <span>{`Notes: ${notes}`}</span>
            <Button
              className="claimnotes_button"
              label="Edit"
              onClick={this._onEdit}
            />
          </Fragment>
        )}
      </div>
    );
  }
}

export default ClaimNotes;
