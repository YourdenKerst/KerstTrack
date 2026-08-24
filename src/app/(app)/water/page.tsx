"use client";

import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { Card } from "@/components/ui";
import { QuickAddWater } from "@/components/water/QuickAddWater";
import { WaterLogList } from "@/components/water/WaterLogList";
import { todayISO } from "@/lib/date";
import { useEffectiveWaterTarget } from "@/lib/hooks/useEffectiveWaterTarget";
import { useWaterLogsForDate } from "@/lib/queries/waterLogs";
import { useUserId } from "@/lib/user-context";

export default function WaterPage() {
  const userId = useUserId();
  const today = todayISO();
  const { targets, waterBumpActive, waterTarget, isLoading } = useEffectiveWaterTarget(userId, today);
  const { data: logs } = useWaterLogsForDate(userId, today);

  const waterMl = (logs ?? []).reduce((sum, log) => sum + log.amount_ml, 0);

  if (isLoading || !targets) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Laden…</div>;
  }

  return (
    <div className="space-y-4 px-4 pt-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Water</h1>
      </header>

      <Card className="flex flex-col items-center gap-2 py-6">
        <ProgressRing value={waterMl} max={waterTarget} size={160} strokeWidth={16} color="var(--macro-water)">
          <div className="text-center">
            <div className="text-2xl font-semibold text-foreground">{waterMl}</div>
            <div className="text-xs text-muted-foreground">/ {waterTarget} ml</div>
          </div>
        </ProgressRing>
        {waterBumpActive && (
          <p className="mt-1 text-center text-xs text-warning">
            Doel is +{targets.alcohol_extra_water_ml} ml door alcohol vandaag of gisteren.
          </p>
        )}
      </Card>

      <QuickAddWater userId={userId} dateISO={today} />

      <WaterLogList userId={userId} dateISO={today} />
    </div>
  );
}
