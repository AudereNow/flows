import React from "react";
import "./NotesAudit.css";
import { TaskChangeRecord } from "../sharedtypes";

interface Props {
  change: TaskChangeRecord;
}

const NotesAudit = (props: Props) => {
  if (!props.change.notes) {
    return null;
  }

  const { timestamp, by, notes } = props.change;
  return (
    <div className="notesaudit_row" key={`${props.change.timestamp}`}>
      <b>
        {`${by} on
            ${new Date(timestamp).toLocaleString()}: `}
      </b>
      {notes}
    </div>
  );
};

export default NotesAudit;
