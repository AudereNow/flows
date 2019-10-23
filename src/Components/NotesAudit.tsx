import React from "react";
import "./NotesAudit.css";
import { TaskChangeRecord } from "../sharedtypes";
import ReactTooltip from "react-tooltip";
import moment from "moment";

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
  const when = moment(timestamp).fromNow();
  const tip = new Date(timestamp).toLocaleString();
  return (
    <div
      className="notesaudit_row"
      key={`${props.change.timestamp}`}
      data-tip={tip}
    >
      {`${by} ${desc} ${when}`}
      {notesClause}
      <ReactTooltip key={tip} />
    </div>
  );
};

export default NotesAudit;
