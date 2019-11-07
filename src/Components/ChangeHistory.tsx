import moment from "moment";
import React from "react";
import ReactTable, { RowRenderProps } from "react-table";
import "react-table/react-table.css";
import ReactTooltip from "react-tooltip";
import { TaskChangeRecord } from "../sharedtypes";
import { getAllChanges } from "../store/corestore";
import debounce from "../util/debounce";
import { containsSearchTerm } from "../util/search";
import Button from "./Button";
import "./ChangeHistory.css";
import CheckBox from "./CheckBox";

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
  allChanges: ChangeRow[];
  changes: ChangeRow[];
  searchTerm: string;
  filters: {};
};

class ChangeHistory extends React.Component<Props, State> {
  state: State = {
    allChanges: [],
    changes: [],
    filters: {},
    searchTerm: ""
  };
  _inputRef: React.RefObject<HTMLInputElement> = React.createRef();

  async componentDidMount() {
    const allChanges = await getAllChanges();
    const allChangesRows = this._recordsToChangeRows(allChanges);

    this.setState({ allChanges: allChangesRows, changes: allChangesRows });
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

  _computeFilteredChanges = (searchTerm: string) => {
    const { filters } = this.state;

    return this.state.allChanges.filter(change => {
      return containsSearchTerm(searchTerm, change, filters);
    });
  };

  _onCheckBoxSelect = (event: React.MouseEvent<HTMLDivElement>) => {
    const name = event.currentTarget.attributes.getNamedItem("data-value")!
      .value;

    let filters = this.state.filters;
    (filters as any)[name] = !(filters as any)[name];
    this.setState({ filters }, () => {
      this._handleSearchChange(this.state.searchTerm);
    });
  };

  _clearSearch = () => {
    this._inputRef.current!.value = "";
    this.setState({
      filters: {},
      searchTerm: "",
      changes: this.state.allChanges
    });
  };
  _onSearchTermChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let input = event.target.value;
    this._handleSearchChange(input);
  };

  _handleSearchChange = debounce((searchTerm: string) => {
    const filteredChanges = this._computeFilteredChanges(searchTerm);

    this.setState({ changes: filteredChanges, searchTerm });
  }, 500);

  render() {
    const { changes } = this.state;
    return (
      <div>
        <div className="changehistory_checkbox_row">
          <div className="changehistory_checkbox_search">
            <div>
              <input
                ref={this._inputRef}
                type="text"
                onChange={this._onSearchTermChange}
              />
              <Button onClick={this._clearSearch} label="Clear Search" />
            </div>
            {TABLE_COLUMNS.map((column, index) => {
              return (
                <CheckBox
                  key={column.accessor + column.Header + index}
                  label={column.Header}
                  value={column.accessor}
                  checked={
                    (this.state.filters as any)[column.accessor] || false
                  }
                  onCheckBoxSelect={this._onCheckBoxSelect}
                />
              );
            })}
          </div>
        </div>
        {changes.length === 0 ? (
          "No changes found"
        ) : (
          <ReactTable
            data={changes}
            columns={TABLE_COLUMNS}
            defaultPageSize={50}
            defaultSorted={[
              {
                id: "timestamp",
                desc: true
              }
            ]}
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
