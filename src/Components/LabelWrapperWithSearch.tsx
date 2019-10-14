import React, { Component } from "react";
import filterIcon from "../assets/filter.svg";
import DropDown from "./Dropdown";
import "./LabelWrapper.css";
import "./LabelWrapperWithSearch.css";

interface Props {
  label?: string;
  className?: string;
  onSearchTermUpdate: (searchTerm: string) => void;
  filterItems?: string[];
  onFilterUpdate?: (filterItem: string) => void;
}

interface State {
  searchBoxOpen: boolean;
}

class LabelWrapperWithSearch extends Component<Props> {
  state: State = {
    searchBoxOpen: false
  };
  _inputRef: React.RefObject<HTMLInputElement> = React.createRef();

  _onSearchClick = () => {
    this.setState({ searchBoxOpen: true }, () => {
      this._inputRef.current!.focus();
    });
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
    const searchBoxContent = (
      <input
        type="text"
        ref={this._inputRef}
        onChange={this._onSearchTermChange}
        onBlur={this._onSearchBlur}
        placeholder="Search"
      />
    );
    return (
      <div className={`labelwrapper_container ${this.props.className}`}>
        <div className="labelwrapper_header">
          {this.state.searchBoxOpen ? searchBoxContent : labelContent}
        </div>
        <div className="labelwrapper_inner">{this.props.children}</div>
      </div>
    );
  }
}

export default LabelWrapperWithSearch;
