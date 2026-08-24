import { dateRangeISO } from "@/lib/date";
import type { SupplementLog } from "@/lib/types";

export type DayStatus = "none" | "partial" | "all";

export interface CalendarDay {
  date: string;
  status: DayStatus;
  checkedCount: number;
}

export function buildSupplementCalendar(
  logs: SupplementLog[],
  totalActiveSupplements: number,
  startISO: string,
  endISO: string,
): CalendarDay[] {
  const checkedByDate = new Map<string, Set<string>>();
  for (const log of logs) {
    const set = checkedByDate.get(log.log_date) ?? new Set<string>();
    set.add(log.supplement_id);
    checkedByDate.set(log.log_date, set);
  }

  return dateRangeISO(startISO, endISO).map((date) => {
    const checkedCount = checkedByDate.get(date)?.size ?? 0;
    let status: DayStatus = "none";
    if (totalActiveSupplements > 0) {
      if (checkedCount >= totalActiveSupplements) status = "all";
      else if (checkedCount > 0) status = "partial";
    }
    return { date, status, checkedCount };
  });
}
