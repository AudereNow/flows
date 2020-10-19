import moment, { Moment } from "moment";

import { ClaimEntry } from "../sharedtypes";

export interface DateRange {
  startDate: Moment | null;
  endDate: Moment | null;
}

const DEFAULT_FILTERS_ENTRY: (keyof ClaimEntry)[] = [
  "patientFirstName",
  "patientLastName",
  "items",
  "phone",
];

export const containsSearchTerm = (
  searchPhrase: string,
  entry: ClaimEntry
): boolean => {
  if (searchPhrase === "") {
    return true;
  }

  let foundCount = 0;
  const phrases = searchPhrase.split(" ");

  phrases.forEach(term => {
    if (term.indexOf(":") > 0) {
      const keyValue = term.split(":");
      const key = keyValue[0].toLowerCase().trim() as keyof ClaimEntry;
      const value = keyValue[1].toLowerCase().trim();
      if (key === "items") {
        const found = entry.items.some(item =>
          item.name.toLowerCase().includes(value)
        );
        if (found) {
          foundCount += 1;
        }
      } else if (
        entry[key] &&
        entry[key]?.toString().toLowerCase().includes(value)
      ) {
        foundCount += 1;
      }
    } else {
      if (
        DEFAULT_FILTERS_ENTRY.some(filter => {
          if (entry[filter]) {
            return entry[filter]
              ?.toString()
              .toLowerCase()
              .includes(term.toLowerCase());
          }
          return false;
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
