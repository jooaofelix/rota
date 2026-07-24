import type { RoutineItemDoc } from "../types";

export function todayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isScheduledOn(item: RoutineItemDoc, date: Date): boolean {
  const dateKey = todayKey(date);
  switch (item.frequency) {
    case "once":
      return item.date === dateKey;
    case "daily":
      return true;
    case "weekly":
    case "custom_days":
      return item.weekdays?.includes(date.getDay()) ?? false;
    default:
      return false;
  }
}
