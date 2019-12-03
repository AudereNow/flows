import React, { useState } from "react";
import "./ExpandableDiv.css";

interface Props {
  children: JSX.Element[] | JSX.Element;
  defaultExpanded?: boolean;
  label?: string;
  onExpand?: () => void;
}

const ExpandableDiv = (props: Props) => {
  const [expanded, setExpanded] = useState(props.defaultExpanded || false);

  if (!!props.onExpand && expanded) {
    props.onExpand();
  }

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="expandableDiv_container"
    >
      {
        <span className="expandableDiv_label">{`${
          !expanded ? "+ Show " : "- Hide "
        } ${props.label || ""}`}</span>
      }
      {!!expanded && props.children}
    </div>
  );
};

export default ExpandableDiv;
