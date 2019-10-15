import { Moment } from "moment";
import React, { Component } from "react";
import { DateRangePicker, FocusedInputShape } from "react-dates";
import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import filterIcon from "../assets/filter.svg";
import { DateRange } from "../util/search";
import Button from "./Button";
import "./DateRangePicker.css";
import DropDown from "./Dropdown";
import "./LabelWrapper.css";
import "./LabelWrapperWithSearch.css";

interface Props {
  label?: string;
  className?: string;
  currentSearchDates?: DateRange | null;
  onSearchTermUpdate: (searchTerm: string) => void;
  filterItems?: string[];
  onClear?: () => void;
  onFilterUpdate?: (filterItem: string) => void;
  onSearchDatesUpdate?: (searchDates: DateRange) => void;
}

interface State {
  searchBoxOpen: boolean;
  focusedInput: FocusedInputShape | null;
}

class LabelWrapperWithSearch extends Component<Props> {
  state: State = {
    searchBoxOpen: false,
    focusedInput: null
  };
  _inputRef: React.RefObject<HTMLInputElement> = React.createRef();

  _onSearchClick = () => {
    this.setState({ searchBoxOpen: !this.state.searchBoxOpen });
  };

  _onSearchTermChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let input = event.target.value;
    this.props.onSearchTermUpdate(input);
  };

  _onSearchBlur = () => {
    if (this._inputRef.current!.value.length === 0) {
      this.setState({ searchBoxOpen: false });
    }
  };

  _onFilterItemClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    if (!!this.props.onFilterUpdate) {
      const filterItem = event.currentTarget.getAttribute("data-name");
      if (filterItem === null) {
        return;
      }
      this.props.onFilterUpdate(filterItem);
    }
  };

  _onDatesChange = ({
    startDate,
    endDate
  }: {
    startDate: Moment | null;
    endDate: Moment | null;
  }) => {
    if (!this.props.onSearchDatesUpdate) {
      return;
    }
    this.props.onSearchDatesUpdate({ startDate, endDate });
  };

  _onFocusChange = (focusedInput: FocusedInputShape | null) => {
    this.setState({ focusedInput });
  };

  _clearSearch = () => {
    const { onClear } = this.props;
    this._inputRef.current!.value = "";
    onClear && onClear();
  };

  render() {
    const dropDownContent = !!this.props.filterItems && (
      <div className="labelwrapper_header_icon">
        <DropDown labelURI={filterIcon}>
          {this.props.filterItems.map(item => (
            <div
              key={item}
              className="labelwrapper_dropdown_text"
              data-name={item}
              onClick={this._onFilterItemClick}
            >
              {item}
            </div>
          ))}
        </DropDown>
      </div>
    );
    const labelContent = (
      <div className="labelwrapper_header_container">
        <div>{this.props.label}</div>
        <div className="labelwrapper_header_icon_container">
          <div
            className="labelwrapper_header_icon"
            onClick={this._onSearchClick}
          >
            &nbsp;&#x1F50E;
          </div>
          {!!this.props.filterItems && dropDownContent}
        </div>
      </div>
    );
    const renderSearchBoxContent = () => {
      const { currentSearchDates } = this.props;

      return (
        <div className="labelwrapper_search_container">
          <DateRangePicker
            startDate={
              !!currentSearchDates ? currentSearchDates.startDate : null
            }
            startDateId={"startDate"}
            endDate={!!currentSearchDates ? currentSearchDates.endDate : null}
            endDateId={"endDate"}
            onDatesChange={this._onDatesChange}
            focusedInput={this.state.focusedInput}
            onFocusChange={this._onFocusChange}
            isOutsideRange={() => false}
          />

          <div className="labelwrapper_row">
            <input
              className="labelwrapper_search_input"
              type="text"
              ref={this._inputRef}
              onChange={this._onSearchTermChange}
              onBlur={this._onSearchBlur}
              placeholder="Search"
            />
            <Button
              className="labelwrapper_button"
              label="Clear Search"
              onClick={this._clearSearch}
            />
            <div
              className="labelwrapper_header_icon labelwrapper_icon_return"
              onClick={this._onSearchClick}
            >
              X
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className={`labelwrapper_container ${this.props.className}`}>
        <div
          className="labelwrapper_header"
          style={{ height: this.state.searchBoxOpen ? 90 : 24 }}
        >
          {this.state.searchBoxOpen ? renderSearchBoxContent() : labelContent}
        </div>
        <div className="labelwrapper_inner">{this.props.children}</div>
      </div>
    );
  }
}

export default LabelWrapperWithSearch;
