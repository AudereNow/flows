import React from "react";
import "./HighlightText.css";

function highlight(text: string, searchTerm: string) {
  let res = [];

  let divided = text.split(searchTerm);

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
