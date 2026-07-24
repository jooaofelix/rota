import { format, parseISO, isToday as fnsIsToday, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export function todayKey(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

export function formatFriendlyDate(date: Date = new Date()): string {
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function formatShortDate(dateKey: string): string {
  return format(parseISO(dateKey), "dd/MM", { locale: ptBR });
}

export function isDateKeyToday(dateKey: string): boolean {
  return fnsIsToday(parseISO(dateKey));
}

export function weekdayIndex(date: Date = new Date()): number {
  return date.getDay(); // 0 = domingo
}

export function daysBetween(fromKey: string, toKey: string): number {
  return differenceInCalendarDays(parseISO(toKey), parseISO(fromKey));
}

export function currentPeriod(date: Date = new Date()): "morning" | "afternoon" | "evening" {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
