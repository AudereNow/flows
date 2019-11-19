import moment, { Moment } from "moment";
import {
  ChangeRowFilters,
  ClaimEntryFilters,
  SiteFilters
} from "../Screens/TaskPanel";

export interface DateRange {
  startDate: Moment | null;
  endDate: Moment | null;
}

function isClaimEntry(entry: any) {
  return entry.hasOwnProperty("patientFirstName");
}

function isChangeRow(entry: any) {
  return entry.hasOwnProperty("taskID");
}

const DEFAULT_CLAIM_ENTRY_FILTERS = {
  patient: true,
  name: true,
  patientID: true,
  item: true
};

const DEFAULT_CHANGE_ROW_FILTERS = {
  taskID: true,
  timestamp: true,
  description: true,
  notes: true
};

const DEFAULT_SITE_FILTERS = {
  name: true
};

export const containsSearchTerm = (
  searchPhrase: string,
  entry: any,
  filters?: ClaimEntryFilters | ChangeRowFilters | SiteFilters
): boolean => {
  if (searchPhrase === "") {
    return true;
  }

  if (!filters || !Object.values(filters).some(value => !!value)) {
    if (isClaimEntry(entry)) {
      filters = DEFAULT_CLAIM_ENTRY_FILTERS;
    } else if (isChangeRow(entry)) {
      filters = DEFAULT_CHANGE_ROW_FILTERS;
    } else {
      filters = DEFAULT_SITE_FILTERS;
    }
  }

  let entryCopy = Object.assign({}, entry);

  if (entry.hasOwnProperty("patientFirstName")) {
    entryCopy.patient = `${entry.patientFirstName ||
      ""} ${entry.patientLastName || ""} ${entry.patientAge ||
      ""} ${entry.patientSex || ""} ${entry.phone || ""}`;
  }

  if (
    entry.hasOwnProperty("timestamp") &&
    filters.hasOwnProperty("timestamp")
  ) {
    const dateString = moment(entry.timestamp).fromNow();
    if (dateString.toLowerCase().includes(searchPhrase.toLowerCase())) {
      return true;
    }
  }

  const filterKeys = Object.keys(filters as any);
  const lowerPhrase = searchPhrase.toLowerCase();

  for (let i = 0; i < filterKeys.length; i++) {
    const filterValue = (filters as any)[filterKeys[i]];
    const filterKey = filterKeys[i];
    if (
      !!filterValue &&
      !!entryCopy[filterKey] &&
      entryCopy[filterKey]
        .toString()
        .toLowerCase()
        .includes(lowerPhrase)
    ) {
      return true;
    }
  }
  return false;
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
