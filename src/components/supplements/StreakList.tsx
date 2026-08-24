"use client";

import { Flame } from "lucide-react";
import { clsx } from "clsx";
import { Card } from "@/components/ui";
import { calculateStreak } from "@/lib/calculations/streaks";
import { daysAgoISO, todayISO } from "@/lib/date";
import { useSupplements } from "@/lib/queries/supplements";
import { useSupplementLogsForRange } from "@/lib/queries/supplementLogs";

export function StreakList({ userId }: { userId: string }) {
  const { data: supplements } = useSupplements(userId);
  const { data: logs } = useSupplementLogsForRange(userId, daysAgoISO(3650), todayISO());

  if (!supplements || supplements.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-2 text-sm font-semibold text-foreground">Streaks</h2>
      <ul className="space-y-2.5">
        {supplements.map((s) => {
          const streak = calculateStreak(logs ?? [], s.id);
          return (
            <li key={s.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{s.name}</span>
              <span className={clsx("flex items-center gap-1 font-medium", streak > 0 ? "text-foreground" : "text-muted-foreground")}>
                <Flame size={15} className={streak > 0 ? "text-warning" : "text-muted-foreground"} />
                {streak} {streak === 1 ? "dag" : "dagen"}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
