import { dateRangeISO } from "@/lib/date";
import type { DailyTargets, WaterLog } from "@/lib/types";

export interface WaterAdherencePoint {
  date: string;
  pct: number;
  totalMl: number;
  targetMl: number;
}

export function computeWaterAdherence(
  waterLogs: WaterLog[],
  targets: DailyTargets,
  startISO: string,
  endISO: string,
): WaterAdherencePoint[] {
  const totalByDate = new Map<string, number>();
  for (const log of waterLogs) {
    totalByDate.set(log.log_date, (totalByDate.get(log.log_date) ?? 0) + log.amount_ml);
  }

  return dateRangeISO(startISO, endISO).map((date) => {
    const targetMl = targets.water_ml;
    const totalMl = totalByDate.get(date) ?? 0;
    return {
      date,
      totalMl,
      targetMl,
      pct: targetMl > 0 ? Math.round((totalMl / targetMl) * 100) : 0,
    };
  });
}
