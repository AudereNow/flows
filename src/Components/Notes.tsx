import "./Notes.css";

import React, { Fragment } from "react";

import LabelTextInput from "./LabelTextInput";
import NotesAudit from "./NotesAudit";
import { TaskChangeRecord } from "../sharedtypes";

interface Props {
  changes: TaskChangeRecord[];
  actionable?: boolean;
  notes: string;
  cannedNotes?: string[];
  onNotesChanged: (notes: string) => void;
}

const Notes = (props: Props) => {
  const { actionable, changes, notes, onNotesChanged, cannedNotes } = props;
  return (
    <div className="notes_container">
      {changes.length > 0 && (
        <React.Fragment>
          {" "}
          <div className="mainview_actions_so_far_header">Actions so far:</div>
          {changes.map((change: TaskChangeRecord, index: number) => {
            return <NotesAudit key={change.by + index} change={change} />;
          })}
        </React.Fragment>
      )}
      {!!actionable && (
        <Fragment>
          {cannedNotes && cannedNotes.length > 0 && (
            <select
              className="notes_canned_responses"
              onChange={event =>
                onNotesChanged(notes + (notes ? "\n" : "") + event.target.value)
              }
            >
              <option value="">--Canned Responses--</option>
              {cannedNotes.map(cannedNote => (
                <option key={cannedNote} value={cannedNote}>
                  {cannedNote}
                </option>
              ))}
            </select>
          )}
          <LabelTextInput
            onTextChange={onNotesChanged}
            label={"Notes"}
            value={notes}
          />
        </Fragment>
      )}
    </div>
  );
};

export default Notes;
