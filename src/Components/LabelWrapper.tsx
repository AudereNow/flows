import React, { Component } from "react";
import "./LabelWrapper.css";

interface Props {
  label?: string;
  className?: string;
  renderLabelItems?: () => JSX.Element;
}

class LabelWrapper extends Component<Props> {
  render() {
    return (
      <div className={`labelwrapper_container ${this.props.className}`}>
        <div className="labelwrapper_header">
          {this.props.label}
          {!!this.props.renderLabelItems && (
            <div className="labelwrapper_labelitems_container">
              {this.props.renderLabelItems()}
            </div>
          )}
        </div>
        <div className="labelwrapper_inner">{this.props.children}</div>
      </div>
    );
  }
}

export default LabelWrapper;
