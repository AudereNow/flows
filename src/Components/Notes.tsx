import React, { Fragment } from "react";
import { TaskChangeRecord } from "../sharedtypes";
import LabelTextInput from "./LabelTextInput";
import "./Notes.css";
import NotesAudit from "./NotesAudit";

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
      <div className="mainview_actions_so_far_header">Actions so far:</div>
      {changes.map((change: TaskChangeRecord, index: number) => {
        return <NotesAudit key={change.by + index} change={change} />;
      })}
      {!!actionable && (
        <Fragment>
          {cannedNotes && (
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
