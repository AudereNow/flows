import React from "react";
import "./Button.css";

interface BaseProps {
  label: string;
  labelImg?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
}

interface KeyedCallback extends BaseProps {
  onClick: (key: string) => void;
  callbackKey: string;
}

interface UnkeyedCallback extends BaseProps {
  onClick: () => void;
}

type Props = KeyedCallback | UnkeyedCallback;

function hasKeyedCallback(props: Props): props is KeyedCallback {
  return (props as KeyedCallback).callbackKey !== undefined;
}

class Button extends React.PureComponent<Props> {
  _onClick = () => {
    if (!this.props.disabled && this.props.onClick) {
      if (hasKeyedCallback(this.props)) {
        this.props.onClick(this.props.callbackKey);
      } else {
        this.props.onClick();
      }
    }
  };

  render() {
    const { className, disabled, label, labelImg, name } = this.props;
    const enabledClassName = disabled ? "disabled" : "enabled";

    return (
      <button
        className={`button_container ${enabledClassName} ${className}`}
        disabled={disabled}
        name={name}
        type="button"
        onClick={this._onClick}
      >
        {!!labelImg && (
          <img className="button_image_label" alt={label} src={labelImg} />
        )}
        {label}
      </button>
    );
  }
}

export default Button;
