import React from "react";
import "./CheckBox.css";

interface Props {
  onCheckBoxSelect: (event: React.MouseEvent<HTMLDivElement>) => void;
  checked: boolean;
  label: string;
  value: string;
}

const CheckBox = (props: Props) => {
  const { checked, onCheckBoxSelect, label, value } = props;
  return (
    <div data-value={value} onClick={onCheckBoxSelect}>
      <input type="checkbox" name={label} readOnly checked={checked} />
      <span className="checkbox_input_label">{label}</span>
    </div>
  );
};

export default CheckBox;
