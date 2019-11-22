import React from "react";
import Button from "./Button";
import { subscribeToNotes, saveNotes } from "../store/corestore";

interface CannedNote {
  title: string;
  note: string;
}

interface Props {
  categoryName: string;
}

interface State {
  notes?: string[];
  editing: { [key: number]: string };
  saving: boolean;
}

export default class CannedNotesEditor extends React.Component<Props> {
  state: State = {
    editing: {},
    saving: false
  };

  _unsubscribe?: () => void;

  componentDidMount() {
    this._unsubscribe = subscribeToNotes(this.props.categoryName, notes =>
      this.setState({ notes })
    );
  }

  componentWillUnmount() {
    if (this._unsubscribe) {
      this._unsubscribe();
    }
  }

  _editNote = (index: number) => {
    if (!this.state.notes) {
      return;
    }
    this.setState({
      editing: {
        ...this.state.editing,
        [index]: this.state.notes[index]
      }
    });
  };

  _changeNote = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!this.state.notes) {
      return;
    }
    const { name, value } = event.target;
    this.setState({
      editing: {
        ...this.state.editing,
        [parseInt(name)]: value
      }
    });
  };

  _saveNote = async (index: number) => {
    if (!this.state.notes) {
      return;
    }
    const newNotes = this.state.notes.map((note, i) =>
      index === i ? this.state.editing[i] : note
    );
    this.setState({
      saving: true
    });
    await saveNotes(this.props.categoryName, newNotes);
    this.setState({
      saving: false,
      editing: {
        ...this.state.editing,
        [index]: undefined
      }
    });
  };

  _deleteNote = async (index: number) => {
    if (!this.state.notes) {
      return;
    }
    console.log(this.state);
    const newNotes = this.state.notes
      .slice(0, index)
      .concat(this.state.notes.slice(index + 1));
    console.log(newNotes);
    this.setState({
      saving: true
    });
    await saveNotes(this.props.categoryName, newNotes);
    this.setState({
      saving: false,
      editing: {
        ...this.state.editing,
        [index]: undefined
      }
    });
  };

  _addNote = async () => {
    if (!this.state.notes) {
      return;
    }
    const newNotes = this.state.notes.concat([""]);
    this.setState({
      editing: {
        ...this.state.editing,
        [this.state.notes.length]: ""
      }
    });
    await saveNotes(this.props.categoryName, newNotes);
  };

  render() {
    if (!this.state.notes) {
      return null;
    }
    return (
      <ul>
        {this.state.notes.map((note, index) =>
          this.state.editing[index] === undefined ? (
            <li key={index}>
              {note}
              <Button label="Edit" onClick={() => this._editNote(index)} />
            </li>
          ) : (
            <li key={index}>
              <input
                type="text"
                onChange={this._changeNote}
                name={index.toString()}
                value={this.state.editing[index]}
              />
              <Button
                label="Save"
                onClick={() => this._saveNote(index)}
                disabled={this.state.saving}
              />
              <Button
                label="Delete"
                onClick={() => this._deleteNote(index)}
                disabled={this.state.saving}
              />
            </li>
          )
        )}
        <li key={"new"}>
          <Button label="Add Canned Note" onClick={this._addNote} />
        </li>
      </ul>
    );
  }
}
