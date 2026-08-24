import type { FoodLog } from "@/lib/types";

export interface MacroTotals {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export function sumMacros(logs: FoodLog[]): MacroTotals {
  return logs.reduce(
    (acc, log) => ({
      calories_kcal: acc.calories_kcal + log.calories_kcal,
      protein_g: acc.protein_g + log.protein_g,
      carbs_g: acc.carbs_g + log.carbs_g,
      fat_g: acc.fat_g + log.fat_g,
      fiber_g: acc.fiber_g + log.fiber_g,
    }),
    { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
  );
}
