export type MealBucket = "ontbijt" | "lunch" | "diner" | "tussendoortje";

export const MEAL_BUCKET_ORDER: MealBucket[] = ["ontbijt", "lunch", "diner", "tussendoortje"];

export const MEAL_BUCKET_LABELS: Record<MealBucket, string> = {
  ontbijt: "Ontbijt",
  lunch: "Lunch",
  diner: "Diner",
  tussendoortje: "Tussendoortjes",
};

/** Indeling puur op tijdstip van loggen — geen apart veld nodig bij het loggen zelf. */
export function mealBucketForTime(loggedAt: string): MealBucket {
  const hour = new Date(loggedAt).getHours();
  if (hour >= 5 && hour < 11) return "ontbijt";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 17 && hour < 22) return "diner";
  return "tussendoortje";
}
