import React from "react";
import "./TextItem.css";

interface Data {
  [key: string]: string;
}

interface Props {
  data: Data;
}

const TextItem = (props: Props) => {
  return (
    <div className="textitem_container">
      <span className="textitem_key">{Object.keys(props.data)[0] + ": "}</span>
      <span>{Object.values(props.data)[0]}</span>
    </div>
  );
};

export default TextItem;
