import React, { useState } from "react";
import "./ToolTipIcon.css";

interface Props {
  label: string;
  tooltip: string;
}

export const ToolTipIcon = (props: Props) => {
  const [hidden, setHidden] = useState(true);
  return (
    <div
      className="tooltipicon_container"
      onMouseEnter={() => setHidden(false)}
      onMouseLeave={() => setHidden(true)}
    >
      <span className="tooltipicon_label">{props.label}</span>
      {!hidden && <div className="tooltipicon_tooltip">{props.tooltip}</div>}
    </div>
  );
};
