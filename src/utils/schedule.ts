import type { CompletionDoc, RoutineItemDoc } from "@/types";
import { todayKey, weekdayIndex } from "./date";

/** Verifica se uma atividade está programada para a data informada. */
export function isScheduledOn(item: RoutineItemDoc, date: Date = new Date()): boolean {
  const dateKey = todayKey(date);

  switch (item.frequency) {
    case "once":
      return item.date === dateKey;
    case "daily":
      return true;
    case "weekly":
    case "custom_days":
      return item.weekdays?.includes(weekdayIndex(date)) ?? false;
    default:
      return false;
  }
}

function timeHasPassed(time: string, now: Date, graceMinutes = 15): boolean {
  const [hours, minutes] = time.split(":").map(Number);
  const scheduled = new Date(now);
  scheduled.setHours(hours, minutes, 0, 0);
  return now.getTime() > scheduled.getTime() + graceMinutes * 60 * 1000;
}

export type TodayStatus = "pending" | "completed" | "partial" | "skipped" | "late";

/**
 * Status de uma atividade "hoje". Para atividades recorrentes o status real do dia
 * vem sempre da conclusão (completion) do dia, nunca do campo status do routineItem
 * (que só é definitivo para atividades únicas).
 */
export function getTodayStatus(item: RoutineItemDoc, completion: CompletionDoc | undefined, now: Date = new Date()): TodayStatus {
  if (completion) {
    return completion.status;
  }
  if (item.frequency === "once" && item.status !== "pending") {
    return item.status as TodayStatus;
  }
  if (item.time && timeHasPassed(item.time, now)) {
    return "late";
  }
  return "pending";
}

export function sortByPeriodAndTime(items: RoutineItemDoc[]): RoutineItemDoc[] {
  const periodOrder = { morning: 0, afternoon: 1, evening: 2 };
  return [...items].sort((a, b) => {
    const periodDiff = periodOrder[a.period] - periodOrder[b.period];
    if (periodDiff !== 0) return periodDiff;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return a.order - b.order;
  });
}
