import type { DailyTargets, FoodLog } from "@/lib/types";
import { sumMacros, type MacroTotals } from "./nutrition";

export interface MacroAdherenceResult {
  key: keyof MacroTotals;
  label: string;
  color: string;
  onTargetPct: number;
  avgDeviationPct: number;
  trackedDays: number;
}

const TOLERANCE = 0.1;

const MACRO_DEFS: { key: keyof MacroTotals; label: string; colorVar: string; targetKey: keyof DailyTargets }[] = [
  { key: "calories_kcal", label: "Calorieën", colorVar: "var(--macro-calories)", targetKey: "calories_kcal" },
  { key: "protein_g", label: "Eiwit", colorVar: "var(--macro-protein)", targetKey: "protein_g" },
  { key: "carbs_g", label: "Koolh.", colorVar: "var(--macro-carbs)", targetKey: "carbs_g" },
  { key: "fat_g", label: "Vet", colorVar: "var(--macro-fat)", targetKey: "fat_g" },
  { key: "fiber_g", label: "Vezels", colorVar: "var(--macro-fiber)", targetKey: "fiber_g" },
];

/** Per macro: % van de gelogde dagen binnen ±10% van het doel, en de gemiddelde afwijking. */
export function computeMacroAdherence(logs: FoodLog[], targets: DailyTargets): MacroAdherenceResult[] {
  const byDate = new Map<string, FoodLog[]>();
  for (const log of logs) {
    const list = byDate.get(log.log_date) ?? [];
    list.push(log);
    byDate.set(log.log_date, list);
  }
  const trackedDays = byDate.size;

  return MACRO_DEFS.map((def) => {
    let onTargetCount = 0;
    let deviationSum = 0;

    for (const dayLogs of byDate.values()) {
      const totals = sumMacros(dayLogs);
      const actual = totals[def.key];
      const target = targets[def.targetKey] as number;
      if (target <= 0) continue;
      const deviationPct = ((actual - target) / target) * 100;
      deviationSum += deviationPct;
      if (Math.abs(deviationPct) <= TOLERANCE * 100) onTargetCount += 1;
    }

    return {
      key: def.key,
      label: def.label,
      color: def.colorVar,
      onTargetPct: trackedDays > 0 ? Math.round((onTargetCount / trackedDays) * 100) : 0,
      avgDeviationPct: trackedDays > 0 ? Math.round(deviationSum / trackedDays) : 0,
      trackedDays,
    };
  });
}
