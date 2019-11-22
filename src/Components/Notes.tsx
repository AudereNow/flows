import React, { Fragment } from "react";
import { TaskChangeRecord } from "../sharedtypes";
import NotesAudit from "./NotesAudit";
import LabelTextInput from "./LabelTextInput";

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
    <Fragment>
      <div className="mainview_actions_so_far_header">Actions so far:</div>
      {changes.map((change: TaskChangeRecord, index: number) => {
        return <NotesAudit key={change.by + index} change={change} />;
      })}
      {!!actionable && (
        <Fragment>
          {cannedNotes && (
            <select
              onChange={event =>
                onNotesChanged(notes + (notes ? "\n" : "") + event.target.value)
              }
            >
              <option value="">--Canned Responses--</option>
              {cannedNotes.map(cannedNote => (
                <option value={cannedNote}>{cannedNote}</option>
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
    </Fragment>
  );
};

export default Notes;
