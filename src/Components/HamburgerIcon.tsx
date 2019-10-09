import React, { PureComponent } from "react";
import "./HamburgerIcon.css";

interface Props {
  active?: boolean;
  height?: number;
  width?: number;
}

class HamburgerIcon extends PureComponent<Props> {
  render() {
    const { active, height, width } = this.props;
    const barColorStyle = { backgroundColor: active ? "white" : "black" };
    return (
      <div
        className="hamburger_container"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <div className="hamburger_bar" style={barColorStyle}></div>
        <div className="hamburger_bar" style={barColorStyle}></div>
        <div className="hamburger_bar" style={barColorStyle}></div>
      </div>
    );
  }
}

export default HamburgerIcon;
