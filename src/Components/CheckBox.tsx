import React, { ChangeEvent, Fragment } from "react";
import "./CheckBox.css";

interface Props {
  onCheckBoxSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  checked: boolean;
  label: string;
  value: string;
  disabled?: boolean;
}

class CheckBox extends React.Component<Props> {
  render() {
    const { checked, onCheckBoxSelect, label, value } = this.props;
    return (
      <Fragment>
        <input
          style={{ display: "inline" }}
          data-value={value}
          type="checkbox"
          name={label}
          readOnly
          checked={checked}
          onChange={onCheckBoxSelect}
          disabled={this.props.disabled}
        />
        <div style={{ display: "inline" }} className="checkbox_input_label">
          {label}
        </div>
      </Fragment>
    );
  }
}

export default CheckBox;
