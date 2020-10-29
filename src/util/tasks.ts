import { Task } from "../sharedtypes";
import moment from "moment";

export function lastUpdatedTime(tasks: Task[]): number {
  return tasks
    .flatMap(task => task.entries)
    .reduce((date, entry) => Math.max(date, entry.lastActedTime), 0);
}

export function lastUpdatedDate(tasks: Task[]): string {
  return moment(lastUpdatedTime(tasks)).format("YYYY-MM-DD");
}
