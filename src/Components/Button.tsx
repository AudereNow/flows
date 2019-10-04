import React from "react";
import "./Button.css";

interface Props {
  className?: string;
  disabledClassName?: string;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}

class Button extends React.PureComponent<Props> {
  _onClick = () => {
    if (!this.props.disabled && this.props.onClick) {
      this.props.onClick();
    }
  };

  render() {
    const { disabled } = this.props;
    const className = disabled
      ? this.props.disabledClassName
      : this.props.className;
    const enabledClassName = disabled ? "disabled" : "enabled";
    return (
      <div
        className={`button_container ${enabledClassName} ${className || ""}`}
        onClick={this._onClick}
      >
        <span className="button_label">{this.props.label}</span>
      </div>
    );
  }
}

export default Button;
