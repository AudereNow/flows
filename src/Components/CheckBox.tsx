import React from "react";
import "./CheckBox.css";

interface Props {
  onCheckBoxSelect: (value: string) => void;
  checked: boolean;
  label: string;
  value: string;
}

class CheckBox extends React.Component<Props> {
  _onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    this.props.onCheckBoxSelect(
      event.currentTarget.attributes.getNamedItem("data-value")!.value
    );
  };

  render() {
    const { checked, label, value } = this.props;
    return (
      <div
        className="checkbox_container"
        data-value={value}
        onClick={this._onClick}
      >
        <input type="checkbox" name={label} readOnly checked={checked} />
        <div className="checkbox_input_label">{label}</div>
      </div>
    );
  }
}

export default CheckBox;
