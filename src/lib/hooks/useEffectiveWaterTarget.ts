"use client";

import { addDaysISO } from "@/lib/date";
import { useAlcoholLogForDate } from "@/lib/queries/alcoholLogs";
import { useDailyTargets } from "@/lib/queries/dailyTargets";

/**
 * Waterdoel voor `dateISO`. Twee aparte signalen:
 * - `correctionActive`: alcohol gisteren gelogd — stuurt de correctie-checklist
 *   (extra magnesiumvoeding/B-complex, zie SCHEMA.md, weekendcorrectie).
 * - `waterBumpActive`: alcohol vandaag ÓF gisteren gelogd — het waterdoel gaat
 *   al omhoog op de dag dat je drinkt, niet pas de dag erna.
 */
export function useEffectiveWaterTarget(userId: string, dateISO: string) {
  const { data: targets } = useDailyTargets(userId);
  const previousDay = addDaysISO(dateISO, -1);
  const { data: todayAlcohol } = useAlcoholLogForDate(userId, dateISO);
  const { data: previousDayAlcohol } = useAlcoholLogForDate(userId, previousDay);

  const correctionActive = Boolean(previousDayAlcohol);
  const waterBumpActive = Boolean(todayAlcohol) || correctionActive;
  const baseTarget = targets?.water_ml ?? 0;
  const bump = waterBumpActive ? targets?.alcohol_extra_water_ml ?? 0 : 0;

  return {
    targets,
    correctionActive,
    waterBumpActive,
    waterTarget: baseTarget + bump,
    isLoading: !targets,
  };
}
