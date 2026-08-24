import type { WeightLog } from "@/lib/types";

interface Point {
  x: number;
  y: number;
}

interface LinearRegressionResult {
  slopePerDay: number;
  intercept: number;
}

function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(`${aISO}T00:00:00`).getTime();
  const b = new Date(`${bISO}T00:00:00`).getTime();
  return (b - a) / (1000 * 60 * 60 * 24);
}

export function linearRegression(points: Point[]): LinearRegressionResult | null {
  const n = points.length;
  if (n < 2) return null;

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slopePerDay: slope, intercept };
}

export interface WeightChartPoint {
  date: string;
  weight: number;
  trend: number | null;
}

export function buildWeightChartData(logs: WeightLog[]): WeightChartPoint[] {
  const sorted = [...logs].sort((a, b) => (a.log_date < b.log_date ? -1 : 1));
  if (sorted.length === 0) return [];

  const firstDate = sorted[0].log_date;
  const points = sorted.map((log) => ({ x: daysBetween(firstDate, log.log_date), y: log.weight_kg }));
  const regression = linearRegression(points);

  return sorted.map((log, i) => ({
    date: log.log_date,
    weight: log.weight_kg,
    trend: regression ? Math.round((regression.slopePerDay * points[i].x + regression.intercept) * 100) / 100 : null,
  }));
}

/** Gemiddelde verandering per week (kg), positief = aankomen, negatief = afvallen. */
export function weeklyRateFromLogs(logs: WeightLog[]): number | null {
  if (logs.length < 2) return null;
  const sorted = [...logs].sort((a, b) => (a.log_date < b.log_date ? -1 : 1));
  const firstDate = sorted[0].log_date;
  const points = sorted.map((log) => ({ x: daysBetween(firstDate, log.log_date), y: log.weight_kg }));
  const regression = linearRegression(points);
  if (!regression) return null;
  return regression.slopePerDay * 7;
}

export type WeeklyRateAssessment = "on_track" | "slower" | "faster" | "gaining" | "insufficient_data";

const EXPECTED_MIN_LOSS = 0.5;
const EXPECTED_MAX_LOSS = 0.7;

/** Vergelijkt het gemeten weekverlies met het verwachte 0,5–0,7 kg/week (zie opdracht). */
export function assessWeeklyRate(ratePerWeek: number | null): WeeklyRateAssessment {
  if (ratePerWeek === null) return "insufficient_data";
  if (ratePerWeek > 0.05) return "gaining";
  const loss = Math.abs(ratePerWeek);
  if (loss >= EXPECTED_MIN_LOSS && loss <= EXPECTED_MAX_LOSS) return "on_track";
  return loss < EXPECTED_MIN_LOSS ? "slower" : "faster";
}
