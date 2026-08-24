"use client";

import { clsx } from "clsx";
import { groupDatesIntoWeeks } from "@/lib/calculations/calendarGrid";
import { buildSupplementCalendar, type DayStatus } from "@/lib/calculations/supplementCalendar";
import { formatShortDate } from "@/lib/date";
import type { SupplementLog } from "@/lib/types";

const STATUS_COLOR: Record<DayStatus, string> = {
  all: "var(--success-cell)",
  partial: "var(--warning-cell)",
  none: "var(--danger-cell)",
};

const STATUS_LABEL: Record<DayStatus, string> = {
  all: "Alles afgevinkt",
  partial: "Deels afgevinkt",
  none: "Niets afgevinkt",
};

const WEEKDAY_LABELS = ["ma", "", "wo", "", "vr", "", ""];

export function StreakCalendar({
  logs,
  totalActiveSupplements,
  startISO,
  endISO,
}: {
  logs: SupplementLog[];
  totalActiveSupplements: number;
  startISO: string;
  endISO: string;
}) {
  const days = buildSupplementCalendar(logs, totalActiveSupplements, startISO, endISO);
  const weeks = groupDatesIntoWeeks(days);

  if (totalActiveSupplements === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nog geen supplementen ingesteld.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3 text-[11px] text-muted-foreground">
        {(["all", "partial", "none"] as DayStatus[]).map((status) => (
          <span key={status} className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm border border-border" style={{ backgroundColor: STATUS_COLOR[status] }} />
            {STATUS_LABEL[status]}
          </span>
        ))}
      </div>

      <div className="flex gap-[3px] overflow-x-auto pb-1">
        <div className="flex flex-col gap-[3px]">
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i} className="flex h-[11px] w-6 items-center text-[9px] text-muted-foreground">
              {label}
            </span>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-[3px]">
            {week.map((day, dayIndex) =>
              day ? (
                <div
                  key={day.date}
                  role="img"
                  aria-label={`${formatShortDate(day.date)}: ${STATUS_LABEL[day.status]}`}
                  title={`${formatShortDate(day.date)} — ${STATUS_LABEL[day.status]} (${day.checkedCount}/${totalActiveSupplements})`}
                  className="h-[11px] w-[11px] rounded-sm border border-border"
                  style={{ backgroundColor: STATUS_COLOR[day.status] }}
                />
              ) : (
                <div key={dayIndex} className="h-[11px] w-[11px]" />
              ),
            )}
          </div>
        ))}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground">Toon als tabel</summary>
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-2 py-1">Datum</th>
                <th className="px-2 py-1 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((day) => (
                <tr key={day.date} className="border-b border-border last:border-b-0">
                  <td className="px-2 py-1 text-foreground">{formatShortDate(day.date)}</td>
                  <td className={clsx("px-2 py-1 text-right text-foreground")}>
                    {STATUS_LABEL[day.status]} ({day.checkedCount}/{totalActiveSupplements})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
