import { Card } from "@/components/ui";
import { relativeDayLabel } from "@/components/dashboard/DaySwitcher";
import { LabeledProgressBar } from "@/components/dashboard/MacroRings";
import type { MacroTotals } from "@/lib/calculations/nutrition";
import { todayISO } from "@/lib/date";
import type { DailyTargets } from "@/lib/types";

export function DayTotalsCard({
  totals,
  targets,
  dateISO,
}: {
  totals: MacroTotals;
  targets: DailyTargets;
  dateISO: string;
}) {
  const label = relativeDayLabel(dateISO, todayISO());

  return (
    <Card className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">
        {label === "Vandaag" || label === "Morgen" || label === "Gisteren" ? `${label} totaal` : `Totaal — ${label}`}
      </h2>
      <LabeledProgressBar
        label="Calorieën"
        value={totals.calories_kcal}
        target={targets.calories_kcal}
        unit="kcal"
        color="var(--macro-calories)"
      />
      <LabeledProgressBar
        label="Eiwit"
        value={totals.protein_g}
        target={targets.protein_g}
        unit="g"
        color="var(--macro-protein)"
      />
      <LabeledProgressBar
        label="Koolhydraten"
        value={totals.carbs_g}
        target={targets.carbs_g}
        unit="g"
        color="var(--macro-carbs)"
      />
      <LabeledProgressBar label="Vet" value={totals.fat_g} target={targets.fat_g} unit="g" color="var(--macro-fat)" />
      <LabeledProgressBar
        label="Vezels"
        value={totals.fiber_g}
        target={targets.fiber_g}
        unit="g"
        color="var(--macro-fiber)"
      />
    </Card>
  );
}
