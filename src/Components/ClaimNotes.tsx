import React, { ChangeEvent, Fragment } from "react";
import { Task } from "../sharedtypes";
import { setClaimNotes } from "../store/corestore";
import Button from "./Button";
import "./ClaimNotes.css";

interface Props {
  claimIndex: number;
  task: Task;
  notes: string;
}

interface State {
  notes: string;
  editing: boolean;
}

class ClaimNotes extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      notes: props.notes,
      editing: false
    };
  }

  _onSave = async () => {
    const { notes } = this.state;
    const { claimIndex, task } = this.props;
    await setClaimNotes(task, claimIndex, notes);
    this.setState({ editing: false });
  };

  _onEdit = () => {
    this.setState({ editing: true });
  };

  _onNotesChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ notes: event.currentTarget.value });
  };

  render() {
    const { notes, editing } = this.state;
    return (
      <div className="claimnotes_row">
        {!!editing ? (
          <Fragment>
            <textarea
              className="claimnotes_textarea"
              onChange={this._onNotesChange}
              defaultValue={notes}
            />
            <Button label="Save Notes" onClick={this._onSave}></Button>
          </Fragment>
        ) : (
          <Fragment>
            <span>{`Notes: ${notes}`}</span>
            <Button label="Edit" onClick={this._onEdit} />
          </Fragment>
        )}
      </div>
    );
  }
}

export default ClaimNotes;
