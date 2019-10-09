import React, { Component } from "react";
import "./LabelWrapper.css";
import "./LabelWrapperWithSearch.css";

interface Props {
  label?: string;
  className?: string;
  onSearchTermUpdate: (searchTerm: string) => void;
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

  render() {
    const labelContent = (
      <div>
        <span>{this.props.label}</span>
        <span
          className="labelwrapper_header_search"
          onClick={this._onSearchClick}
        >
          &nbsp;&#x1F50E;
        </span>
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
