import React from "react";
import { Filters } from "../Screens/TaskPanel";
import "./TextItem.css";

export interface TextData {
  displayKey?: string;
  searchKey: string;
  value: string;
}

interface Props {
  data: TextData;
  searchTermGlobal?: string;
  valueOnly?: boolean; // true = no display key or unstyled display key; false = styled display key
  className?: string;
  filters?: Filters;
}

function highlight(props: Props) {
  const { searchKey, value } = props.data;
  const searchTerm = props.searchTermGlobal;
  let filters = props.filters || {};
  if (!filters || !Object.values(filters).some(value => !!value)) {
    filters = { patient: true, name: true, patientID: true, item: true };
  }

  if (!(filters as any)[searchKey]) {
    return [value];
  }

  const regexp = new RegExp("(" + searchTerm + ")", "gi");
  const divided = value.split(regexp);

  return divided.map((phrase: string) => {
    if (phrase.toLowerCase() === searchTerm!.toLowerCase()) {
      return (
        <span key={phrase} className="highlight">
          {phrase}
        </span>
      );
    }
    return phrase;
  });
}

const TextItem = (props: Props) => {
  const { displayKey } = props.data;
  return (
    <div className="textitem_container">
      {!props.valueOnly && !!displayKey && (
        <span className="textitem_key">{displayKey + ":"}</span>
      )}
      <div className={props.className}>
        {props.valueOnly && !!displayKey && displayKey + ": "}
        {!!props.searchTermGlobal ? highlight(props) : props.data.value}
      </div>
    </div>
  );
};

export default TextItem;
