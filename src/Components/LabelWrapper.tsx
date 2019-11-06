import React, { Component } from "react";
import "./LabelWrapper.css";

interface Props {
  label?: string;
  className?: string;
  renderLabelItems?: () => JSX.Element;
  searchPanel?: JSX.Element;
}

class LabelWrapper extends Component<Props> {
  render() {
    return (
      <div className={`labelwrapper_container ${this.props.className}`}>
        <div className="labelwrapper_header">
          <div className="labelwrapper_header_item"></div>
          <div className="labelwrapper_header_item">{this.props.label}</div>
          <div className="labelwrapper_header_item">
            {!!this.props.renderLabelItems && this.props.renderLabelItems()}
          </div>
        </div>
        {!!this.props.searchPanel && this.props.searchPanel}
        <div className="labelwrapper_inner">{this.props.children}</div>
      </div>
    );
  }
}

export default LabelWrapper;
