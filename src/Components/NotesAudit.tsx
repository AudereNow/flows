import React from "react";
import { TaskChangeMetadata } from "../store/corestore";
import "./NotesAudit.css";

interface Props {
  change: TaskChangeMetadata;
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
