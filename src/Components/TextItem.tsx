import React from "react";
import "./TextItem.css";

export interface TextData {
  displayKey?: string;
  searchKey: string;
  value: string;
}

export const SearchContext = React.createContext({
  searchTermGlobal: ""
});

interface Props {
  data: TextData;
  valueOnly?: boolean; // true = no display key or unstyled display key; false = styled display key
  className?: string;
}

function highlight(props: Props, searchTerm: string) {
  const { searchKey, value } = props.data;

  const keyValues = searchTerm.split(",");
  for (let i = 0; i < keyValues.length; i++) {
    const keyValue = keyValues[i];
    let key: string;
    let searchValue: string;
    if (keyValue.indexOf(":") > 0) {
      const split = keyValue.split(":");
      key = split[0].trim().toLowerCase();
      searchValue = split[1].trim().toLowerCase();
    } else {
      key = searchKey;
      searchValue = keyValue.trim();
    }
    if (
      key === searchKey &&
      value
        .toLowerCase()
        .trim()
        .includes(searchValue)
    ) {
      const regexp = new RegExp("(" + searchValue + ")", "gi");
      const divided = value.split(regexp);
      return divided.map((phrase: string, index: number) => {
        if (
          phrase
            .toLowerCase()
            .trim()
            .includes(searchValue)
        ) {
          return (
            <span key={phrase + index} className="highlight">
              {phrase}
            </span>
          );
        } else {
          return phrase;
        }
      });
    }
  }
  return value;
}

export default class TextItem extends React.Component<Props> {
  static contextType = SearchContext;

  render() {
    const { displayKey } = this.props.data;
    const { searchTermGlobal } = this.context;

    return (
      <div className="textitem_container">
        {!this.props.valueOnly && !!displayKey && (
          <span className="textitem_key pharmacy_text">{displayKey + ":"}</span>
        )}
        <div className={this.props.className}>
          {this.props.valueOnly && !!displayKey && displayKey + ": "}
          {!!searchTermGlobal
            ? highlight(this.props, searchTermGlobal)
            : this.props.data.value}
        </div>
      </div>
    );
  }
}
