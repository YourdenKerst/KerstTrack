export interface RecipeNutrition {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

/** Alles wat sumRecipeIngredients nodig heeft — zowel een opgeslagen RecipeIngredient als een nog-niet-opgeslagen PickedIngredient voldoen hieraan. */
export interface RecipeIngredientLike {
  grams: number;
  calories_kcal_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  fiber_g_per_100g: number;
}

/** Totaal gewicht van het volledige recept (som van alle ingrediënten). */
export function totalRecipeGrams(ingredients: RecipeIngredientLike[]): number {
  return ingredients.reduce((sum, i) => sum + i.grams, 0);
}

/** Som van de voedingswaarden van alle ingrediënten, voor het hele recept (niet herschaald). */
export function sumRecipeIngredients(ingredients: RecipeIngredientLike[]): RecipeNutrition {
  const totals: RecipeNutrition = { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };

  for (const ingredient of ingredients) {
    const factor = ingredient.grams / 100;
    totals.calories_kcal += ingredient.calories_kcal_per_100g * factor;
    totals.protein_g += ingredient.protein_g_per_100g * factor;
    totals.carbs_g += ingredient.carbs_g_per_100g * factor;
    totals.fat_g += ingredient.fat_g_per_100g * factor;
    totals.fiber_g += ingredient.fiber_g_per_100g * factor;
  }

  return totals;
}

/** Herschaalt een recept (of een deel ervan) naar een opgegeven hoeveelheid in gram. */
export function scaleRecipeToGrams(ingredients: RecipeIngredientLike[], grams: number): RecipeNutrition {
  const totalGrams = totalRecipeGrams(ingredients);
  const totals = sumRecipeIngredients(ingredients);
  if (totalGrams <= 0) return totals;

  const factor = grams / totalGrams;
  return {
    calories_kcal: Math.round(totals.calories_kcal * factor * 100) / 100,
    protein_g: Math.round(totals.protein_g * factor * 100) / 100,
    carbs_g: Math.round(totals.carbs_g * factor * 100) / 100,
    fat_g: Math.round(totals.fat_g * factor * 100) / 100,
    fiber_g: Math.round(totals.fiber_g * factor * 100) / 100,
  };
}
