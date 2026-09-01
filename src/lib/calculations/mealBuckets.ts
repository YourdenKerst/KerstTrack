import type { MealCategory } from "@/lib/types";

export type { MealCategory };

export const MEAL_CATEGORY_ORDER: MealCategory[] = [
  "ontbijt",
  "snack_na_ontbijt",
  "lunch",
  "snack_na_lunch",
  "avondeten",
  "snack_na_avondeten",
];

export const MEAL_CATEGORY_LABELS: Record<MealCategory, string> = {
  ontbijt: "Ontbijt",
  snack_na_ontbijt: "Snack na ontbijt",
  lunch: "Lunch",
  snack_na_lunch: "Snack na lunch",
  avondeten: "Avondeten",
  snack_na_avondeten: "Snack na avondeten",
};

/**
 * Redelijke standaardkeuze op basis van het huidige tijdstip — je kunt 'm
 * altijd zelf overschrijven via de dropdown bij het loggen. Puur een
 * voorinvulling, geen afgeleide/vaste indeling zoals voorheen.
 */
export function defaultMealCategoryForTime(date: Date = new Date()): MealCategory {
  const t = date.getHours() + date.getMinutes() / 60;
  if (t >= 5 && t < 10.5) return "ontbijt";
  if (t >= 10.5 && t < 11.5) return "snack_na_ontbijt";
  if (t >= 11.5 && t < 14.5) return "lunch";
  if (t >= 14.5 && t < 17) return "snack_na_lunch";
  if (t >= 17 && t < 20.5) return "avondeten";
  return "snack_na_avondeten";
}
