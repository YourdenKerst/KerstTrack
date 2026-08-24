"use client";

import { Trash2 } from "lucide-react";
import { relativeDayLabel } from "@/components/dashboard/DaySwitcher";
import { Card } from "@/components/ui";
import { todayISO } from "@/lib/date";
import { useDeleteFoodLog, useFoodLogsForDate } from "@/lib/queries/foodLogs";

export function TodayFoodList({ userId, dateISO }: { userId: string; dateISO: string }) {
  const { data: logs } = useFoodLogsForDate(userId, dateISO);
  const deleteLog = useDeleteFoodLog(userId);
  const label = relativeDayLabel(dateISO, todayISO());
  const isToday = label === "Vandaag";

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-foreground">
        {isToday ? "Vandaag gelogd" : `Gelogd — ${label}`}
      </h2>
      {(!logs || logs.length === 0) && (
        <p className="text-sm text-muted-foreground">
          {isToday ? "Nog niets gelogd vandaag." : `Nog niets gelogd voor ${label.toLowerCase()}.`}
        </p>
      )}
      <ul className="divide-y divide-border">
        {(logs ?? []).map((log) => (
          <li key={log.id} className="flex items-center justify-between gap-2 py-2">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">{log.name}</span>
              <span className="block text-xs text-muted-foreground">
                {Math.round(log.calories_kcal)} kcal · {Math.round(log.protein_g)}p / {Math.round(log.carbs_g)}k /{" "}
                {Math.round(log.fat_g)}v / {Math.round(log.fiber_g)}vez
              </span>
            </span>
            <button
              type="button"
              onClick={() => deleteLog.mutate({ id: log.id, log_date: log.log_date })}
              aria-label={`Verwijder ${log.name}`}
              className="shrink-0 rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-danger active:bg-surface-muted active:text-danger"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
