export const MILLIS_IN_SEC = 1000;
export const SECS_IN_MIN = 60;
export const MINS_IN_HOUR = 60;
export const HOURS_IN_DAY = 24;
export const MILLIS_IN_MIN = SECS_IN_MIN * MILLIS_IN_SEC;
export const MILLIS_IN_HOUR = MINS_IN_HOUR * MILLIS_IN_MIN;
export const MILLIS_IN_DAY = HOURS_IN_DAY * MILLIS_IN_HOUR;
export const DAYS_IN_WEEK = 7;
export const MONTHS_IN_YEAR = 12;
export const WEEKS_IN_YEAR = 52.0;
export const WEEKS_IN_MONTH = WEEKS_IN_YEAR / MONTHS_IN_YEAR;
export const DAYS_IN_YEAR = 365.25;
export const MILLIS_IN_YEAR = DAYS_IN_YEAR * MILLIS_IN_DAY;
export const MILLIS_IN_MONTH = (DAYS_IN_YEAR / MONTHS_IN_YEAR) * MILLIS_IN_DAY;
export const MILLIS_IN_WEEK = MILLIS_IN_DAY * DAYS_IN_WEEK;

export function relativeTime(from: number, to: number): string {
  const delta = Math.abs(from - to);
  const relation = from > to ? "ago" : "hence";
  let scalar = 0;
  let unit = "";

  if (delta < MILLIS_IN_SEC) {
    return "now";
  }

  if (delta >= MILLIS_IN_YEAR) {
    scalar = Math.floor(delta / MILLIS_IN_YEAR);
    unit = scalar > 1 ? "years" : "year";
  } else if (delta >= MILLIS_IN_MONTH) {
    scalar = Math.floor(delta / MILLIS_IN_MONTH);
    unit = scalar > 1 ? "months" : "month";
  } else if (delta >= MILLIS_IN_WEEK) {
    scalar = Math.floor(delta / MILLIS_IN_WEEK);
    unit = scalar > 1 ? "weeks" : "week";
  } else if (delta >= MILLIS_IN_DAY) {
    scalar = Math.floor(delta / MILLIS_IN_DAY);
    if (scalar === 1) {
      return from > to ? "yesterday" : "tomorrow";
    }
    unit = scalar > 1 ? "days" : "day";
  } else if (delta >= MILLIS_IN_HOUR) {
    scalar = Math.floor(delta / MILLIS_IN_HOUR);
    unit = scalar > 1 ? "hours" : "hour";
  } else if (delta >= MILLIS_IN_MIN) {
    scalar = Math.floor(delta / MILLIS_IN_MIN);
    unit = scalar > 1 ? "mins" : "min";
  } else {
    scalar = Math.floor(delta / MILLIS_IN_SEC);
    unit = scalar > 1 ? "secs" : "sec";
  }

  return `${scalar} ${unit} ${relation}`;
}
