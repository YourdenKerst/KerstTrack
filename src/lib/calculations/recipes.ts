import { MICRONUTRIENT_META } from "@/lib/constants";
import type { MicronutrientKey } from "@/lib/types";

export interface RecipeNutrition {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  vitamin_d_mcg: number | null;
  magnesium_mg: number | null;
  vitamin_b1_mg: number | null;
  vitamin_b6_mg: number | null;
  vitamin_b12_mcg: number | null;
  omega3_mg: number | null;
  zinc_mg: number | null;
  potassium_mg: number | null;
  calcium_mg: number | null;
  iron_mg: number | null;
}

/** Alles wat sumRecipeIngredients nodig heeft — zowel een opgeslagen RecipeIngredient als een nog-niet-opgeslagen PickedIngredient voldoen hieraan. */
export interface RecipeIngredientLike {
  grams: number;
  calories_kcal_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  fiber_g_per_100g: number;
  vitamin_d_mcg_per_100g: number | null;
  magnesium_mg_per_100g: number | null;
  vitamin_b1_mg_per_100g: number | null;
  vitamin_b6_mg_per_100g: number | null;
  vitamin_b12_mcg_per_100g: number | null;
  omega3_mg_per_100g: number | null;
  zinc_mg_per_100g: number | null;
  potassium_mg_per_100g: number | null;
  calcium_mg_per_100g: number | null;
  iron_mg_per_100g: number | null;
}

function micronutrientPer100gKey(key: MicronutrientKey): keyof RecipeIngredientLike {
  return `${key}_per_100g` as keyof RecipeIngredientLike;
}

/** Totaal gewicht van het volledige recept (som van alle ingrediënten). */
export function totalRecipeGrams(ingredients: RecipeIngredientLike[]): number {
  return ingredients.reduce((sum, i) => sum + i.grams, 0);
}

/** Som van de voedingswaarden van alle ingrediënten, voor het hele recept (niet herschaald). */
export function sumRecipeIngredients(ingredients: RecipeIngredientLike[]): RecipeNutrition {
  const totals: RecipeNutrition = {
    calories_kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    vitamin_d_mcg: null,
    magnesium_mg: null,
    vitamin_b1_mg: null,
    vitamin_b6_mg: null,
    vitamin_b12_mcg: null,
    omega3_mg: null,
    zinc_mg: null,
    potassium_mg: null,
    calcium_mg: null,
    iron_mg: null,
  };

  for (const ingredient of ingredients) {
    const factor = ingredient.grams / 100;
    totals.calories_kcal += ingredient.calories_kcal_per_100g * factor;
    totals.protein_g += ingredient.protein_g_per_100g * factor;
    totals.carbs_g += ingredient.carbs_g_per_100g * factor;
    totals.fat_g += ingredient.fat_g_per_100g * factor;
    totals.fiber_g += ingredient.fiber_g_per_100g * factor;

    for (const meta of MICRONUTRIENT_META) {
      const value = ingredient[micronutrientPer100gKey(meta.key)];
      if (typeof value === "number") {
        totals[meta.key] = (totals[meta.key] ?? 0) + value * factor;
      }
    }
  }

  return totals;
}

/** Herschaalt een recept (of een deel ervan) naar een opgegeven hoeveelheid in gram. */
export function scaleRecipeToGrams(ingredients: RecipeIngredientLike[], grams: number): RecipeNutrition {
  const totalGrams = totalRecipeGrams(ingredients);
  const totals = sumRecipeIngredients(ingredients);
  if (totalGrams <= 0) return totals;

  const factor = grams / totalGrams;
  const scaled = { ...totals };
  for (const key of Object.keys(scaled) as (keyof RecipeNutrition)[]) {
    const value = scaled[key];
    if (typeof value === "number") {
      scaled[key] = Math.round(value * factor * 100) / 100;
    }
  }
  return scaled;
}
