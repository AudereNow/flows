import React from "react";
import { Filters } from "../Screens/TaskPanel";
import "./HighlightText.css";

export interface SearchText {
  searchKey: string;
  value: string;
}

function highlight(text: SearchText, searchTerm: string, filters: Filters) {
  const { searchKey, value } = text;

  if (!(filters as any)[searchKey]) {
    return [value];
  }

  const regexp = new RegExp("(" + searchTerm + ")", "gi");
  const divided = value.split(regexp);

  return divided.map((phrase: string) => {
    if (phrase.toLowerCase() === searchTerm.toLowerCase()) {
      return (
        <span key={phrase} className="highlight">
          {phrase}
        </span>
      );
    }
    return phrase;
  });
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
