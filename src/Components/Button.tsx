import React from "react";
import "./Button.css";

interface Props {
  label?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  onClick?: () => void;
}

class Button extends React.PureComponent<Props> {
  _onClick = () => {
    if (!this.props.disabled && this.props.onClick) {
      this.props.onClick();
    }
  };

  render() {
    const { className, disabled, label, name } = this.props;
    const enabledClassName = disabled ? "disabled" : "enabled";

    return (
      <button
        className={`button_container ${enabledClassName} ${className || ""}`}
        disabled={disabled}
        name={name}
        type="button"
        onClick={this._onClick}
      >
        {label}
      </button>
    );
  }
}

export default Button;
