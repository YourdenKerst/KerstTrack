"use client";

import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui";
import { useDeleteWaterLog, useWaterLogsForDate } from "@/lib/queries/waterLogs";

export function WaterLogList({ userId, dateISO }: { userId: string; dateISO: string }) {
  const { data: logs } = useWaterLogsForDate(userId, dateISO);
  const deleteLog = useDeleteWaterLog(userId);

  const sorted = [...(logs ?? [])].reverse();

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-foreground">Vandaag gelogd</h2>
      {sorted.length === 0 && <p className="text-sm text-muted-foreground">Nog niets gelogd vandaag.</p>}
      <ul className="divide-y divide-border">
        {sorted.map((log) => (
          <li key={log.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-foreground">
              {log.amount_ml} ml{" "}
              <span className="text-muted-foreground">· {format(new Date(log.logged_at), "HH:mm")}</span>
            </span>
            <button
              type="button"
              onClick={() => deleteLog.mutate({ id: log.id, logDate: log.log_date })}
              aria-label="Verwijder waterlog"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-danger"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
