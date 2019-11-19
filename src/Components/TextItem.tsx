import React from "react";
import { ClaimEntryFilters } from "../Screens/TaskPanel";
import "./TextItem.css";

export interface TextData {
  displayKey?: string;
  searchKey: string;
  value: string;
}

export const SearchContext = React.createContext({
  searchTermGlobal: "",
  filters: {}
});

interface Props {
  data: TextData;
  valueOnly?: boolean; // true = no display key or unstyled display key; false = styled display key
  className?: string;
}

function highlight(
  props: Props,
  searchTerm: string,
  filters: ClaimEntryFilters
) {
  const { searchKey, value } = props.data;
  filters = filters || {};
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

export default class TextItem extends React.Component<Props> {
  static contextType = SearchContext;

  render() {
    const { displayKey } = this.props.data;
    const { searchTermGlobal, filters } = this.context;
    return (
      <div className="textitem_container">
        {!this.props.valueOnly && !!displayKey && (
          <span className="textitem_key">{displayKey + ":"}</span>
        )}
        <div className={this.props.className}>
          {this.props.valueOnly && !!displayKey && displayKey + ": "}
          {!!searchTermGlobal
            ? highlight(this.props, searchTermGlobal, filters)
            : this.props.data.value}
        </div>
      </div>
    );
  }
}
