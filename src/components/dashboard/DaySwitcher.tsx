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
        className="rounded-full p-3 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground active:bg-surface-muted active:text-foreground"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="relative inline-flex items-center justify-center">
        <span className="pointer-events-none px-2 text-sm font-medium text-foreground">
          {relativeDayLabel(selectedDate, today)}
        </span>
        <input
          type="date"
          value={selectedDate}
          max={maxDate}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          aria-label="Kies een datum"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <button
        type="button"
        onClick={() => onChange(addDaysISO(selectedDate, 1))}
        disabled={selectedDate >= maxDate}
        aria-label="Volgende dag"
        className="rounded-full p-3 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground active:bg-surface-muted active:text-foreground disabled:opacity-30"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
