"use client";

import { useState } from "react";
import { AlcoholCorrelationCards } from "@/components/trends/AlcoholCorrelationCards";
import { MacroAdherenceChart } from "@/components/trends/MacroAdherenceChart";
import { StreakCalendar } from "@/components/trends/StreakCalendar";
import { WaterAdherenceChart } from "@/components/trends/WaterAdherenceChart";
import { WeightChart } from "@/components/weight/WeightChart";
import { PeriodSelector } from "@/components/charts/PeriodSelector";
import { Card } from "@/components/ui";
import { addDaysISO, periodStartISO, todayISO, type Period } from "@/lib/date";
import { useAlcoholLogsForRange } from "@/lib/queries/alcoholLogs";
import { useDailyTargets } from "@/lib/queries/dailyTargets";
import { useFoodLogsForRange } from "@/lib/queries/foodLogs";
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

export default function TrendsPage() {
  const userId = useUserId();
  const [period, setPeriod] = useState<Period>("30d");
  const today = todayISO();
  const start = periodStartISO(period);
  const lookbackStart = addDaysISO(start, -1);

  const { data: targets } = useDailyTargets(userId);
  const { data: weightLogs } = useWeightLogsForRange(userId, start, today);
  const { data: foodLogs } = useFoodLogsForRange(userId, start, today);
  const { data: supplements } = useSupplements(userId);
  const { data: supplementLogs } = useSupplementLogsForRange(userId, start, today);
  const { data: waterLogs } = useWaterLogsForRange(userId, start, today);
  const { data: alcoholLogs } = useAlcoholLogsForRange(userId, lookbackStart, today);

  if (!targets) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Laden…</div>;
  }

  return (
    <div className="space-y-4 px-4 pt-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Trends</h1>
      </header>

      <PeriodSelector value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Gewicht over tijd</h2>
        <WeightChart logs={weightLogs ?? []} />
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Macro-adherence</h2>
        <MacroAdherenceChart logs={foodLogs ?? []} targets={targets} />
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Supplement-streaks</h2>
        <StreakCalendar
          logs={supplementLogs ?? []}
          totalActiveSupplements={supplements?.length ?? 0}
          startISO={start}
          endISO={today}
        />
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Water-adherence</h2>
        <WaterAdherenceChart
          waterLogs={waterLogs ?? []}
          alcoholLogs={alcoholLogs ?? []}
          targets={targets}
          startISO={start}
          endISO={today}
        />
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Alcohol-correlatie</h2>
        <AlcoholCorrelationCards
          weightLogs={weightLogs ?? []}
          alcoholLogs={alcoholLogs ?? []}
          startISO={start}
          endISO={today}
        />
      </Card>
    </div>
  );
}
