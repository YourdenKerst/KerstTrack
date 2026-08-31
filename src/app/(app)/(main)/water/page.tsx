"use client";

import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { Card } from "@/components/ui";
import { QuickAddWater } from "@/components/water/QuickAddWater";
import { WaterLogList } from "@/components/water/WaterLogList";
import { todayISO } from "@/lib/date";
import { useDailyTargets } from "@/lib/queries/dailyTargets";
import { useWaterLogsForDate } from "@/lib/queries/waterLogs";
import { useUserId } from "@/lib/user-context";

export default function WaterPage() {
  const userId = useUserId();
  const today = todayISO();
  const { data: targets } = useDailyTargets(userId);
  const { data: logs } = useWaterLogsForDate(userId, today);

  const waterMl = (logs ?? []).reduce((sum, log) => sum + log.amount_ml, 0);

  if (!targets) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Laden…</div>;
  }

  return (
    <div className="space-y-4 px-4 pt-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Water</h1>
      </header>

      <Card className="flex flex-col items-center gap-2 py-6">
        <ProgressRing value={waterMl} max={targets.water_ml} size={160} strokeWidth={16} color="var(--macro-water)">
          <div className="text-center">
            <div className="text-2xl font-semibold text-foreground">{waterMl}</div>
            <div className="text-xs text-muted-foreground">/ {targets.water_ml} ml</div>
          </div>
        </ProgressRing>
      </Card>

      <QuickAddWater userId={userId} dateISO={today} />

      <WaterLogList userId={userId} dateISO={today} />
    </div>
  );
}
