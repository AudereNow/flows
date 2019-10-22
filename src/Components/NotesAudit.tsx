import React from "react";
import "./NotesAudit.css";
import { TaskChangeRecord } from "../sharedtypes";
import { relativeTime } from "../util/display";

interface Props {
  change: TaskChangeRecord;
}

const NotesAudit = (props: Props) => {
  const { timestamp, by, state, fromState, notes } = props.change;
  const notesClause = notes ? (
    <span>
      {": "}
      <strong>{notes}</strong>
    </span>
  ) : (
    ""
  );
  const desc = `moved from ${fromState} to ${state}`;
  const when = relativeTime(Date.now(), timestamp);
  return (
    <div className="notesaudit_row" key={`${props.change.timestamp}`}>
      {`${by} ${desc} ${when}`}
      {notesClause}
    </div>
  );
};

export default NotesAudit;
