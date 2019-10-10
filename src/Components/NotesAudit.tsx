import React, { Fragment } from "react";
import { TaskChangeMetadata } from "../store/corestore";
import "./NotesAudit.css";

interface Props {
  changes: any[];
}

const NotesAudit = (props: Props) => {
  if (props.changes.length < 0) {
    return null;
  }
  return (
    <Fragment>
      {props.changes.map((change: TaskChangeMetadata, index) => {
        if (!change.notes) {
          return null;
        }
        return (
          <div className="notesaudit_row" key={`${change.timestamp}-${index}`}>
            <b>
              {`${change.by} on
            ${new Date(change.timestamp).toLocaleString()}: `}
            </b>
            {change.notes}
          </div>
        );
      })}
    </Fragment>
  );
};

export default NotesAudit;
