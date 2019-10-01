import React, { Component } from "react";
import "./LabelWrapper.css";

interface Props {
  label?: string;
  className?: string;
}

class LabelWrapper extends Component<Props> {
  render() {
    return (
      <div className={`labelwrapper_container ${this.props.className}`}>
        <div className="labelwrapper_header">{this.props.label}</div>
        <div className="labelwrapper_inner">{this.props.children}</div>
      </div>
    );
  }
}

export default LabelWrapper;
