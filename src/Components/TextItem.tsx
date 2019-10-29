import React from "react";
import { Filters } from "../Screens/TaskPanel";
import HighlightText from "./HighlightText";
import "./TextItem.css";

interface Data {
  displayKey?: string;
  searchKey: string;
  value: string;
}

interface Props {
  data: Data;
  searchTermGlobal?: string;
  valueOnly?: boolean;
  className?: string;
  filters?: Filters;
}

const TextItem = (props: Props) => {
  const { searchKey, displayKey } = props.data;
  return (
    <div className="textitem_container">
      {!props.valueOnly && (
        <span className="textitem_key">
          {(!!displayKey ? displayKey : searchKey) + ":"}
        </span>
      )}

      <HighlightText
        className={props.className}
        filters={props.filters}
        text={props.data}
        searchTerm={props.searchTermGlobal}
      />
    </div>
  );
};

export default TextItem;
