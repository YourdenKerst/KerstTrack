import { dateRangeISO, startOfWeekISO } from "@/lib/date";
import type { AlcoholLog, WeightLog } from "@/lib/types";

const HIGH_ALCOHOL_THRESHOLD = 2; // dagen per week

export interface AlcoholCalendarDay {
  date: string;
  hadAlcohol: boolean;
}

/** Welke dagen in de periode alcohol gelogd is — voor de patroon-kalender. */
export function buildAlcoholCalendar(
  alcoholLogs: AlcoholLog[],
  startISO: string,
  endISO: string,
): AlcoholCalendarDay[] {
  const alcoholDates = new Set(alcoholLogs.map((l) => l.log_date));
  return dateRangeISO(startISO, endISO).map((date) => ({ date, hadAlcohol: alcoholDates.has(date) }));
}

export interface AlcoholCorrelationResult {
  highAlcoholAvgDelta: number | null;
  lowAlcoholAvgDelta: number | null;
  highAlcoholWeeks: number;
  lowAlcoholWeeks: number;
}

/**
 * Vergelijkt het gemiddelde gewichtsverloop per week tussen weken met veel
 * (>= 2 dagen) en weken met weinig/geen alcohol. Puur beschrijvend — geen
 * medische claim, alleen de eigen data van de gebruiker.
 */
export function computeAlcoholCorrelation(
  weightLogs: WeightLog[],
  alcoholLogs: AlcoholLog[],
): AlcoholCorrelationResult {
  const alcoholDaysByWeek = new Map<string, number>();
  for (const log of alcoholLogs) {
    const week = startOfWeekISO(log.log_date);
    alcoholDaysByWeek.set(week, (alcoholDaysByWeek.get(week) ?? 0) + 1);
  }

  const weightsByWeek = new Map<string, WeightLog[]>();
  for (const log of weightLogs) {
    const week = startOfWeekISO(log.log_date);
    const list = weightsByWeek.get(week) ?? [];
    list.push(log);
    weightsByWeek.set(week, list);
  }

  const highDeltas: number[] = [];
  const lowDeltas: number[] = [];

  for (const [week, logs] of weightsByWeek.entries()) {
    if (logs.length < 2) continue;
    const sorted = [...logs].sort((a, b) => (a.log_date < b.log_date ? -1 : 1));
    const delta = sorted[sorted.length - 1].weight_kg - sorted[0].weight_kg;
    const alcoholDays = alcoholDaysByWeek.get(week) ?? 0;
    if (alcoholDays >= HIGH_ALCOHOL_THRESHOLD) {
      highDeltas.push(delta);
    } else {
      lowDeltas.push(delta);
    }
  }

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null);

  return {
    highAlcoholAvgDelta: avg(highDeltas),
    lowAlcoholAvgDelta: avg(lowDeltas),
    highAlcoholWeeks: highDeltas.length,
    lowAlcoholWeeks: lowDeltas.length,
  };
}
