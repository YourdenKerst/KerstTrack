"use client";

import { clsx } from "clsx";
import type { Period } from "@/lib/date";

export function PeriodSelector({
  value,
  onChange,
  options,
}: {
  value: Period;
  onChange: (period: Period) => void;
  options: { value: Period; label: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-surface-muted p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={clsx(
            "flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
            value === opt.value ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
