import moment, { Moment } from "moment";
import { Filters } from "../Screens/TaskPanel";

export interface DateRange {
  startDate: Moment | null;
  endDate: Moment | null;
}

export const containsSearchTerm = (
  searchPhrase: string,
  entry: any,
  filters?: Filters
): boolean => {
  if (searchPhrase === "") {
    return true;
  }

  if (!filters || !Object.values(filters).some(value => !!value)) {
    filters = { patient: true, name: true, patientID: true, item: true };
  }

  let entryCopy = Object.assign({}, entry);
  entryCopy.patient = `${entry.patientFirstName} ${entry.patientLastName} ${entry.patientAge} ${entry.patientSex}`;
  const filterKeys = Object.keys(filters as any);
  const lowerPhrase = searchPhrase.toLowerCase();

  for (let i = 0; i < filterKeys.length; i++) {
    const filterValue = (filters as any)[filterKeys[i]];
    const filterKey = filterKeys[i];
    if (
      !!filterValue &&
      !!entryCopy[filterKey] &&
      entryCopy[filterKey].toLowerCase().includes(lowerPhrase)
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
