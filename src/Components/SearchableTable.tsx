import { json2csv } from "json-2-csv";
import moment from "moment";
import React from "react";
import ReactTable from "react-table";
import "react-table/react-table.css";
import { HistoryRow } from "../Screens/AdminPanel";
import debounce from "../util/debounce";
import { containsSearchTerm } from "../util/search";
import Button from "./Button";
import CheckBox from "./CheckBox";
import "./SearchableTable.css";

type Props = {
  tableColumns: any[];
  allData: HistoryRow[];
  downloadPrefix: string;
};
type State = {
  allData: any[];
  data: any[];
  searchTerm: string;
  filters: {};
};

class SearchableTable extends React.Component<Props, State> {
  state: State = {
    allData: this.props.allData,
    data: this.props.allData,
    filters: {},
    searchTerm: ""
  };
  _inputRef: React.RefObject<HTMLInputElement> = React.createRef();

  _computeFilteredChanges = (searchTerm: string) => {
    const { filters } = this.state;

    return this.state.allData.filter(row => {
      return containsSearchTerm(searchTerm, row, filters);
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
    const json2csvOptions = { checkSchemaDifferences: false };

    json2csv(
      data,
      (err, csv) => {
        if (!csv || err) {
          alert("Something went wrong when trying to download your csv");
        }
        const encodedURI = encodeURI(
          `data:text/csv;charset=utf-8,${data
            .map(row => row.join(","))
            .join(`\n`)}`
        );
        const link = document.createElement("a");
        link.setAttribute("href", encodedURI);
        link.setAttribute("download", `${fileName}.csv`);
        link.click();
      },
      json2csvOptions
    );
  };

  render() {
    const { data } = this.state;
    const { tableColumns } = this.props;

    return (
      <div>
        <div className="searchabletable_checkbox_row">
          <div className="searchabletable_checkbox_search">
            <div>
              <input
                ref={this._inputRef}
                type="text"
                onChange={this._onSearchTermChange}
              />
              <Button onClick={this._clearSearch} label="Clear Search" />
            </div>
            {tableColumns.map((column, index) => {
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
            <Button onClick={this._downloadCSV} label="Download CSV" />
          </div>
        </div>
        {data.length === 0 ? (
          "No changes found"
        ) : (
          <ReactTable
            data={data}
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

export default SearchableTable;
