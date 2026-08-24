import { addDays, format, startOfWeek, subDays } from "date-fns";
import { nl } from "date-fns/locale";

const DATE_FMT = "yyyy-MM-dd";

export function toISODate(date: Date): string {
  return format(date, DATE_FMT);
}

function parseISODate(dateISO: string): Date {
  return new Date(`${dateISO}T00:00:00`);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function yesterdayISO(): string {
  return toISODate(subDays(new Date(), 1));
}

export function addDaysISO(dateISO: string, amount: number): string {
  return toISODate(addDays(parseISODate(dateISO), amount));
}

/** Hoeveel dagen vooruit je maaltijden mag voorplannen vanaf de dashboard-dagwisselaar. */
export const MAX_FUTURE_PLANNING_DAYS = 3;

export function isBeforeToday(dateISO: string): boolean {
  return dateISO < todayISO();
}

export function startOfWeekISO(dateISO: string): string {
  return toISODate(startOfWeek(parseISODate(dateISO), { weekStartsOn: 1 }));
}

export function daysAgoISO(n: number): string {
  return toISODate(subDays(new Date(), n));
}

/** Inclusieve lijst van ISO-datums van start t/m eind. */
export function dateRangeISO(startISO: string, endISO: string): string[] {
  const dates: string[] = [];
  let cursor = parseISODate(startISO);
  const end = parseISODate(endISO);
  while (cursor <= end) {
    dates.push(toISODate(cursor));
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function formatShortDate(dateISO: string): string {
  return format(parseISODate(dateISO), "d MMM", { locale: nl });
}

export function formatWeekdayDate(dateISO: string): string {
  return format(parseISODate(dateISO), "EEEEEE d MMM", { locale: nl });
}

export function formatFullDate(dateISO: string): string {
  return format(parseISODate(dateISO), "EEEE d MMMM yyyy", { locale: nl });
}

export type Period = "7d" | "30d" | "90d" | "all";

const EPOCH_START = "2000-01-01";

/** Startdatum (ISO) voor een periode, geëindigd op vandaag. "all" gaat terug tot een ver verleden. */
export function periodStartISO(period: Period): string {
  switch (period) {
    case "7d":
      return daysAgoISO(6);
    case "30d":
      return daysAgoISO(29);
    case "90d":
      return daysAgoISO(89);
    case "all":
      return EPOCH_START;
  }
}
