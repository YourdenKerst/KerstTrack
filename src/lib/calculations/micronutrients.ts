import { MICRONUTRIENT_META } from "@/lib/constants";
import type { FoodLog, MicronutrientKey, Supplement } from "@/lib/types";

export interface MicronutrientTotal {
  key: MicronutrientKey;
  total: number;
  /** Hoeveel van de gegeven logs een bekende waarde hadden voor deze stof. */
  loggedCount: number;
}

export type MicronutrientTotals = Record<MicronutrientKey, MicronutrientTotal>;

/** Somt micronutriënten over logs, negeert null/onbekend (telt niet als 0 mee). */
export function sumMicronutrients(logs: FoodLog[]): MicronutrientTotals {
  const result = {} as MicronutrientTotals;

  for (const meta of MICRONUTRIENT_META) {
    let total = 0;
    let loggedCount = 0;
    for (const log of logs) {
      const value = log[meta.key];
      if (typeof value === "number") {
        total += value;
        loggedCount += 1;
      }
    }
    result[meta.key] = { key: meta.key, total, loggedCount };
  }

  return result;
}

/** Telt vandaag afgevinkte, aan een voedingsstof gekoppelde supplementen mee bij de totalen. */
export function applyLinkedSupplements(
  totals: MicronutrientTotals,
  supplements: Supplement[],
  checkedSupplementIds: Set<string>,
): MicronutrientTotals {
  const result = { ...totals };

  for (const supplement of supplements) {
    if (!supplement.linked_nutrient_key || supplement.linked_nutrient_amount === null) continue;
    if (!checkedSupplementIds.has(supplement.id)) continue;

    const key = supplement.linked_nutrient_key;
    result[key] = {
      ...result[key],
      total: result[key].total + supplement.linked_nutrient_amount,
      loggedCount: result[key].loggedCount + 1,
    };
  }

  return result;
}
