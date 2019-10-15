import moment, { Moment } from "moment";

export interface DateRange {
  startDate: Moment | null;
  endDate: Moment | null;
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
    if (!dateRange.startDate || current >= dateRange.startDate) {
      fromTrue = true;
    }

    if (!dateRange.endDate || current <= dateRange.endDate) {
      toTrue = true;
    }

    return fromTrue && toTrue;
  }
  return false;
};
