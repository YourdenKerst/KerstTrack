"use client";

import { useState } from "react";
import { PeriodSelector } from "@/components/charts/PeriodSelector";
import { Card } from "@/components/ui";
import { WeightChart } from "@/components/weight/WeightChart";
import { WeightLogForm } from "@/components/weight/WeightLogForm";
import { WeightStatsCard } from "@/components/weight/WeightStatsCard";
import { periodStartISO, todayISO, type Period } from "@/lib/date";
import { useWeightLogsForRange } from "@/lib/queries/weightLogs";
import { useUserId } from "@/lib/user-context";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "7d", label: "Week" },
  { value: "30d", label: "Maand" },
  { value: "90d", label: "3 maanden" },
  { value: "all", label: "Alles" },
];

export default function WeightPage() {
  const userId = useUserId();
  const [period, setPeriod] = useState<Period>("30d");
  const today = todayISO();
  const { data: logs } = useWeightLogsForRange(userId, periodStartISO(period), today);

  return (
    <div className="space-y-4 px-4 pt-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Gewicht</h1>
      </header>

      <Card>
        <WeightLogForm userId={userId} />
      </Card>

      <PeriodSelector value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />

      <Card>
        <WeightChart logs={logs ?? []} />
      </Card>

      <WeightStatsCard logs={logs ?? []} />
    </div>
  );
}
