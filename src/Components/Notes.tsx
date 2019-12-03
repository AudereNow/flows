import React, { Fragment } from "react";
import { TaskChangeRecord } from "../sharedtypes";
import LabelTextInput from "./LabelTextInput";
import NotesAudit from "./NotesAudit";

interface Props {
  changes: TaskChangeRecord[];
  actionable?: boolean;
  notes: string;
  onNotesChanged: (notes: string) => void;
}

const Notes = (props: Props) => {
  const { actionable, changes, notes, onNotesChanged } = props;
  return (
    <Fragment>
      <div className="mainview_actions_so_far_header">Actions so far:</div>
      {changes.map((change: TaskChangeRecord, index: number) => {
        return <NotesAudit key={change.by + index} change={change} />;
      })}
      {!!actionable && (
        <LabelTextInput
          onTextChange={onNotesChanged}
          label={"Notes"}
          value={notes}
        />
      )}
    </Fragment>
  );
};

export default Notes;
