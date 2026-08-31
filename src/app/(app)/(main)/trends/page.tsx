"use client";

import { useState } from "react";
import { StreakCalendar } from "@/components/trends/StreakCalendar";
import { WaterAdherenceChart } from "@/components/trends/WaterAdherenceChart";
import { WeightChart } from "@/components/weight/WeightChart";
import { PeriodSelector } from "@/components/charts/PeriodSelector";
import { Card } from "@/components/ui";
import { periodStartISO, todayISO, type Period } from "@/lib/date";
import { useDailyTargets } from "@/lib/queries/dailyTargets";
import { useSupplements } from "@/lib/queries/supplements";
import { useSupplementLogsForRange } from "@/lib/queries/supplementLogs";
import { useWaterLogsForRange } from "@/lib/queries/waterLogs";
import { useWeightLogsForRange } from "@/lib/queries/weightLogs";
import { useUserId } from "@/lib/user-context";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 dagen" },
  { value: "30d", label: "30 dagen" },
  { value: "90d", label: "90 dagen" },
  { value: "all", label: "Alles" },
];

function WeightTrendCard({ userId }: { userId: string }) {
  const [period, setPeriod] = useState<Period>("30d");
  const today = todayISO();
  const start = periodStartISO(period);
  const { data: weightLogs } = useWeightLogsForRange(userId, start, today);

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Gewicht over tijd</h2>
      </div>
      <PeriodSelector value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
      <div className="mt-3">
        <WeightChart logs={weightLogs ?? []} />
      </div>
    </Card>
  );
}

function WaterTrendCard({ userId }: { userId: string }) {
  const [period, setPeriod] = useState<Period>("30d");
  const today = todayISO();
  const start = periodStartISO(period);
  const { data: targets } = useDailyTargets(userId);
  const { data: waterLogs } = useWaterLogsForRange(userId, start, today);

  if (!targets) return null;

  return (
    <Card>
      <h2 className="mb-2 text-sm font-semibold text-foreground">Water-adherence</h2>
      <PeriodSelector value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
      <div className="mt-3">
        <WaterAdherenceChart waterLogs={waterLogs ?? []} targets={targets} startISO={start} endISO={today} />
      </div>
    </Card>
  );
}

// Supplement-checkoffs worden na 3 maanden opgeruimd (zie schema.sql) — "Alles"
// levert hier dus in de praktijk hetzelfde op als "90 dagen".
const SUPPLEMENT_PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 dagen" },
  { value: "30d", label: "30 dagen" },
  { value: "90d", label: "3 maanden" },
];

function SupplementStreakCard({ userId }: { userId: string }) {
  const [period, setPeriod] = useState<Period>("30d");
  const today = todayISO();
  const start = periodStartISO(period);
  const { data: supplements } = useSupplements(userId);
  const { data: supplementLogs } = useSupplementLogsForRange(userId, start, today);

  return (
    <Card>
      <h2 className="mb-2 text-sm font-semibold text-foreground">Supplement-streaks</h2>
      <PeriodSelector value={period} onChange={setPeriod} options={SUPPLEMENT_PERIOD_OPTIONS} />
      <div className="mt-3">
        <StreakCalendar
          logs={supplementLogs ?? []}
          totalActiveSupplements={supplements?.length ?? 0}
          startISO={start}
          endISO={today}
        />
      </div>
    </Card>
  );
}

export default function TrendsPage() {
  const userId = useUserId();

  return (
    <div className="space-y-4 px-4 pt-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Trends</h1>
      </header>

      <WeightTrendCard userId={userId} />
      <WaterTrendCard userId={userId} />
      <SupplementStreakCard userId={userId} />
    </div>
  );
}
