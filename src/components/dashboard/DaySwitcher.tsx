"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysISO, formatWeekdayDate, MAX_FUTURE_PLANNING_DAYS, todayISO } from "@/lib/date";

export function relativeDayLabel(dateISO: string, today: string): string {
  if (dateISO === today) return "Vandaag";
  if (dateISO === addDaysISO(today, 1)) return "Morgen";
  if (dateISO === addDaysISO(today, -1)) return "Gisteren";
  return formatWeekdayDate(dateISO);
}

export function DaySwitcher({
  selectedDate,
  onChange,
}: {
  selectedDate: string;
  onChange: (dateISO: string) => void;
}) {
  const today = todayISO();
  const maxDate = addDaysISO(today, MAX_FUTURE_PLANNING_DAYS);

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => onChange(addDaysISO(selectedDate, -1))}
        aria-label="Vorige dag"
        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm font-medium text-foreground">{relativeDayLabel(selectedDate, today)}</span>
      <button
        type="button"
        onClick={() => onChange(addDaysISO(selectedDate, 1))}
        disabled={selectedDate >= maxDate}
        aria-label="Volgende dag"
        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-30"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
