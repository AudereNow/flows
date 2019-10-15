import moment, { Moment } from "moment";

export interface DateRange {
  from: Moment | null;
  to: Moment | null;
}

export const containsSearchTerm = (
  searchPhrase: string,
  entry: any
): boolean => {
  const keys = Object.keys(entry);

  let searchKey;
  if (searchPhrase.includes(":")) {
    const searchArr = searchPhrase.split(":");
    searchKey = searchArr[0].trim().toLowerCase();
    searchPhrase = searchArr[1];
  }
  searchPhrase = searchPhrase.trim().toLowerCase();
  if (searchPhrase.length === 0) {
    return false;
  }
  for (let i = 0; i < keys.length; i++) {
    const value = entry[keys[i]];
    if (
      ((!!searchKey && keys[i].toLowerCase().includes(searchKey)) ||
        !searchKey) &&
      (!!value &&
        value
          .toString()
          .trim()
          .toLowerCase()
          .includes(searchPhrase))
    ) {
      return true;
    }
  }

  return false;
};

export const withinDateRange = (dateRange: DateRange, entry: any) => {
  let fromTrue = false;
  let toTrue = false;

  if (entry.hasOwnProperty("timestamp")) {
    let current = moment(entry.timestamp);
    if (!dateRange.from || current >= dateRange.from) {
      fromTrue = true;
    }

    if (!dateRange.to || current <= dateRange.to) {
      toTrue = true;
    }

    return fromTrue && toTrue;
  }
  return false;
};
