"use client";

import { Trash2, UtensilsCrossed } from "lucide-react";
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
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">{isToday ? "Vandaag gegeten" : `Gegeten — ${label}`}</h2>
      {(!logs || logs.length === 0) && (
        <Card>
          <p className="text-sm text-muted-foreground">
            {isToday ? "Nog niets gelogd vandaag." : `Nog niets gelogd voor ${label.toLowerCase()}.`}
          </p>
        </Card>
      )}
      <ul className="space-y-2">
        {(logs ?? []).map((log) => (
          <li key={log.id}>
            <Card className="flex items-center gap-3 p-3">
              {log.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- eigen/OFF-afbeelding, geen build-time optimalisatie nodig
                <img src={log.image_url} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground">
                  <UtensilsCrossed size={18} />
                </div>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{log.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {Math.round(log.calories_kcal)} kcal
                  {log.ingredient_count != null && ` · ${log.ingredient_count} producten`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => deleteLog.mutate({ id: log.id, log_date: log.log_date })}
                aria-label={`Verwijder ${log.name}`}
                className="shrink-0 rounded-full p-2.5 text-muted-foreground transition-colors active:bg-surface-muted active:text-danger"
              >
                <Trash2 size={14} />
              </button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
