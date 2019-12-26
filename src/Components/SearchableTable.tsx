import { json2csv } from "json-2-csv";
import moment from "moment";
import React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import ReactTable, { Column } from "react-table";
import "react-table/react-table.css";
import ClearSearchImg from "../assets/close.png";
import DownloadCSVImg from "../assets/downloadcsv.png";
import { HistoryRow } from "../Screens/AdminPanel";
import { defaultConfig } from "../store/config";
import debounce from "../util/debounce";
import { containsSearchTerm } from "../util/search";
import Button from "./Button";
import "./SearchableTable.css";
import { ToolTipIcon } from "./ToolTipIcon";

type Props = RouteComponentProps & {
  tableColumns: Column<any>[];
  allData: HistoryRow[];
  downloadPrefix: string;
};
type State = {
  allData: any[];
  data: any[];
  searchTerm: string;
};

const STATE_TO_PANEL = Object.keys(defaultConfig.tabs).reduce(
  (res: any, item: any) => {
    const tab = defaultConfig.tabs[item];
    if ((tab as any).taskState) {
      res[(tab as any).taskState] = tab.baseUrl;
    }
    return res;
  },
  {}
);

class SearchableTable extends React.Component<Props, State> {
  state: State = {
    allData: this.props.allData,
    data: this.props.allData,
    searchTerm: ""
  };
  _inputRef: React.RefObject<HTMLInputElement> = React.createRef();

  _computeFilteredChanges = (searchTerm: string) => {
    return this.state.allData.filter(row => {
      return containsSearchTerm(searchTerm, row);
    });
  };

  _clearSearch = () => {
    this._inputRef.current!.value = "";
    this.setState({
      searchTerm: "",
      data: this.state.allData
    });
  };
  _onSearchTermChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let input = event.target.value;
    this._handleSearchChange(input);
  };

  _handleSearchChange = debounce((searchTerm: string) => {
    const filteredData = this._computeFilteredChanges(searchTerm);

    this.setState({ data: filteredData, searchTerm });
  }, 500);

  _downloadCSV = () => {
    const { data } = this.state;
    const { downloadPrefix } = this.props;

    if (data.length === 0) {
      alert("There are no tasks to download! Please adjust your search.");
    }
    const fileName = downloadPrefix + "_" + moment().format("YYYYMMDD_HHmmss");

    data.map(row => {
      row.time = new Date(row.time).toString();
      return row;
    });

    json2csv(data, (err, csv) => {
      if (!csv || err) {
        alert("Something went wrong when trying to download your csv");
      }
      const dataString = "data:text/csv;charset=utf-8," + csv;
      const encodedURI = encodeURI(dataString);
      const link = document.createElement("a");
      link.setAttribute("href", encodedURI);
      link.setAttribute("download", `${fileName}.csv`);
      link.click();
    });
  };

  _onRowClick = (state: any, rowInfo: any, column: any, instance: any) => {
    return {
      onClick: (e: any) => {
        const columnName = column.Header;
        const id = rowInfo.original.id;
        const state = rowInfo.original.state;

        if (
          columnName.toLowerCase() === "id" &&
          STATE_TO_PANEL.hasOwnProperty(state)
        ) {
          this.props.history.push(`/${(STATE_TO_PANEL as any)[state]}/${id}`);
        }
      }
    };
  };

  render() {
    const { data } = this.state;
    const { tableColumns } = this.props;

    return (
      <div>
        <div className="searchabletable_row">
          <input
            className="searchabletable_input"
            placeholder="Search by keyword(s)"
            ref={this._inputRef}
            type="text"
            onChange={this._onSearchTermChange}
          />
          <ToolTipIcon
            label={"ⓘ"}
            iconClassName="tooltipicon_information"
            tooltip={
              "Available search keys: 'id', 'time', 'description', 'notes'. Example query: id:xvc, time:11/24"
            }
          />
          <Button
            className="searchabletable_button"
            labelImg={ClearSearchImg}
            onClick={this._clearSearch}
            label="Clear Search"
          />
          <Button
            className="searchabletable_button"
            labelImg={DownloadCSVImg}
            onClick={this._downloadCSV}
            label="Download CSV"
          />
        </div>

        {data.length === 0 ? (
          "No changes found"
        ) : (
          <ReactTable
            className="-striped -highlight"
            data={data}
            getTdProps={this._onRowClick}
            columns={tableColumns}
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

export default withRouter(SearchableTable);
