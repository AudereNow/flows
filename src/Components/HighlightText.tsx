import React from "react";
import { Filters } from "../Screens/TaskPanel";
import "./HighlightText.css";

export interface SearchText {
  searchKey: string;
  value: string;
}

function highlight(text: SearchText, searchTerm: string, filters: Filters) {
  let res = [];
  const { searchKey, value } = text;

  if (!(filters as any)[searchKey]) {
    return [text.value];
  }

  const divided = value.split(searchTerm);

  for (let i = 0; i < divided.length; i++) {
    const piece = divided[i];
    if (piece.length > 0) {
      res.push(piece);
    }

    if (i < divided.length - 1) {
      res.push(
        <span key={piece} className="highlight">
          {searchTerm}
        </span>
      );
    }
  }
  return res;
}

interface Props {
  text: SearchText;
  searchTerm?: string;
  className?: string;
  filters?: Filters;
}

const HighlightText = (props: Props) => {
  return (
    <div className={props.className}>
      {!!props.searchTerm
        ? highlight(props.text, props.searchTerm, props.filters || {})
        : props.text.value}
    </div>
  );
};

export default HighlightText;
