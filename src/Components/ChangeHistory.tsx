import React from "react";
import { TaskChangeRecord } from "../sharedtypes";
import { getAllChanges } from "../store/corestore";
import ReactTooltip from "react-tooltip";
import moment from "moment";
import ReactTable, { RowRenderProps } from "react-table";
import "react-table/react-table.css";

const TABLE_COLUMNS = [
  { Header: "Task ID", accessor: "taskID", minWidth: 150 },
  {
    Header: "Time",
    accessor: "timestamp",
    Cell: (props: RowRenderProps) => renderTooltippedTime(props.value),
    minWidth: 100
  },
  { Header: "Description", accessor: "description", minWidth: 450 },
  { Header: "Notes", accessor: "notes", minWidth: 200 }
];

type ChangeRow = {
  taskID: string;
  timestamp: number;
  description: string;
  notes?: string;
};

type Props = {};
type State = {
  changes: ChangeRow[];
};

class ChangeHistory extends React.Component<Props, State> {
  state: State = {
    changes: []
  };

  async componentDidMount() {
    const changes = await getAllChanges();

    this.setState({ changes: this._recordsToChangeRows(changes) });
  }

  _recordsToChangeRows(records: TaskChangeRecord[]): ChangeRow[] {
    return records.map(r => {
      return {
        taskID: r.taskID,
        timestamp: r.timestamp,
        description: `${r.by} changed task from ${r.fromState} to ${r.state}`,
        notes: r.notes
      };
    });
  }

  render() {
    const { changes } = this.state;
    return (
      <div>
        {changes.length === 0 ? (
          "No changes found"
        ) : (
          <ReactTable
            data={changes}
            columns={TABLE_COLUMNS}
            defaultPageSize={50}
          />
        )}
      </div>
    );
  }
}

function renderTooltippedTime(timestamp: number) {
  const when = moment(timestamp).fromNow();
  const tip = new Date(timestamp).toLocaleString();

  return (
    <span data-tip={tip}>
      {when}
      <ReactTooltip key={tip} />
    </span>
  );
}

export default ChangeHistory;
