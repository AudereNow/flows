import moment, { Moment } from "moment";

export interface DateRange {
  startDate: Moment | null;
  endDate: Moment | null;
}

const DEFAULT_FILTERS_ENTRY = ["patient", "item", "pharmacy"];
const DEFAULT_FILTERS_HISTORY = ["id", "time", "description", "notes"];

export const containsSearchTerm = (
  searchPhrase: string,
  entry: any
): boolean => {
  if (searchPhrase === "") {
    return true;
  }

  if (entry.hasOwnProperty("patientFirstName")) {
    (entry as any).patient = `${entry.patientFirstName ||
      ""} ${entry.patientLastName || ""} ${entry.patientAge ||
      ""} ${entry.patientSex || ""} ${entry.phone || ""}`;
  }

  let foundCount = 0;
  const phrases = searchPhrase.split(",");

  phrases.forEach(term => {
    if (term.indexOf(":") > 0) {
      const keyValue = term.split(":");
      const key = keyValue[0].toLowerCase().trim();
      const value = keyValue[1].toLowerCase().trim();
      if (
        entry[key] &&
        entry[key]
          .toString()
          .toLowerCase()
          .includes(value)
      ) {
        foundCount += 1;
      }
    } else {
      const defaultFilters = entry.hasOwnProperty("claimedCost")
        ? DEFAULT_FILTERS_ENTRY
        : DEFAULT_FILTERS_HISTORY;
      if (
        defaultFilters.some(filter => {
          return (
            entry[filter] &&
            entry[filter]
              .toString()
              .toLowerCase()
              .includes(term)
          );
        })
      ) {
        foundCount += 1;
      }
    }
  });
  return foundCount === phrases.length;
};

export const withinDateRange = (dateRange: DateRange, entry: any) => {
  if (!dateRange.startDate && !dateRange.endDate) return true;

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
