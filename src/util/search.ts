import moment, { Moment } from "moment";

import { ClaimEntry } from "../sharedtypes";

export interface DateRange {
  startDate: Moment | null;
  endDate: Moment | null;
}

const CLAIM_SEARCH_KEYS_MAP: { [key: string]: (keyof ClaimEntry)[] } = {
  patient: ["patientFirstName", "patientLastName"],
  item: ["items"],
  phone: ["phone"],
};

const ALL_CLAIM_SEARCH_KEYS: (keyof ClaimEntry)[] = [
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

  const phrases = searchPhrase.split(" ");

  return phrases.every(term => {
    let keys = ALL_CLAIM_SEARCH_KEYS;
    let value = term;
    if (term.indexOf(":") > 0) {
      const keyValue = term.split(":");
      keys = CLAIM_SEARCH_KEYS_MAP[keyValue[0].toLowerCase().trim()];
      value = keyValue[1].toLowerCase().trim();
    }
    return keys.some(key => {
      if (key === "items") {
        return entry.items.some(item =>
          item.name.toLowerCase().includes(value)
        );
      }
      return entry[key] && entry[key]?.toString().toLowerCase().includes(value);
    });
  });
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
