import React from "react";
import "./Button.css";

interface Props {
  className?: string;
  label: string;
  onClick?: () => void;
}

const Button = (props: Props) => {
  return (
    <div
      className={`button_container ${props.className}`}
      onClick={props.onClick}
    >
      <span className="button_label">{props.label}</span>
    </div>
  );
};

export default Button;
