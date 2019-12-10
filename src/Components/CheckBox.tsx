import React from "react";
import "./CheckBox.css";

interface Props {
  onCheckBoxSelect: (value: string, checked: boolean) => void;
  checked: boolean;
  label: string;
  value: string;
  disabled?: boolean;
}

class CheckBox extends React.Component<Props> {
  _onCheckBoxSelect = () => {
    this.props.onCheckBoxSelect(this.props.value, !this.props.checked);
  };

  render() {
    const { checked, label, value } = this.props;
    return (
      <div className="checkbox_row" onClick={this._onCheckBoxSelect}>
        <input
          style={{ display: "inline" }}
          data-value={value}
          className="checkbox_input"
          type="checkbox"
          name={label}
          readOnly
          checked={checked}
          disabled={this.props.disabled}
        />
        <div style={{ display: "inline" }} className="checkbox_input">
          {label}
        </div>
      </div>
    );
  }
}

export default CheckBox;
