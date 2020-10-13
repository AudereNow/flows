import "./CheckBox.css";

import React from "react";

interface Props {
  onCheckBoxSelect: (value: string, checked: boolean) => void;
  checked: boolean;
  label: string;
  value: string;
  disabled?: boolean;
  radio?: boolean;
}

class CheckBox extends React.Component<Props> {
  _onCheckBoxSelect = () => {
    this.props.onCheckBoxSelect(this.props.value, !this.props.checked);
  };

  render() {
    const { checked, label, value, radio } = this.props;
    return (
      <div className="checkbox_row" onClick={this._onCheckBoxSelect}>
        <input
          style={{ display: "inline" }}
          data-value={value}
          className="checkbox_input"
          type={radio ? "radio" : "checkbox"}
          name={label + value}
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
