import React from "react";
import HighlightText from "./HighlightText";
import "./TextItem.css";

interface Data {
  [key: string]: string;
}

interface Props {
  data: Data;
  searchTermGlobal?: string;
}

const TextItem = (props: Props) => {
  return (
    <div className="textitem_container">
      <span className="textitem_key">{Object.keys(props.data)[0] + ":"}</span>
      <span>
        <HighlightText
          text={Object.values(props.data)[0]}
          searchTerm={props.searchTermGlobal}
        />
      </span>
    </div>
  );
};

export default TextItem;
