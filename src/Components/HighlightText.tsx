import React from "react";
import "./HighlightText.css";

function highlight(text: string, searchTerm: string) {
  let res = [];

  let right = 0;
  let left = 0;
  while (right <= text.length - searchTerm.length) {
    const currTerm = text.substring(right, right + searchTerm.length);
    if (currTerm === searchTerm) {
      if (left !== right) {
        res.push(text.substring(left, right));
      }
      res.push(
        <span key={left} className="highlight">
          {searchTerm}
        </span>
      );
      right += searchTerm.length;
      left = right;
    }
    right += 1;
  }

  if (left < text.length) {
    res.push(text.substring(left));
  }

  return res;
}

interface Props {
  text: string;
  searchTerm?: string;
  className?: string;
}

const HighlightText = (props: Props) => {
  return (
    <div className={props.className}>
      {!!props.searchTerm
        ? highlight(props.text, props.searchTerm)
        : props.text}
    </div>
  );
};

export default HighlightText;
