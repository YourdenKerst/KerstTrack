import { differenceInYears } from "date-fns";
import type { MicronutrientTargetFields, Sex } from "@/lib/types";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalPlan = "afvallen" | "onderhoud" | "spieropbouw";

export const ACTIVITY_LEVELS: { key: ActivityLevel; label: string; multiplier: number }[] = [
  { key: "sedentary", label: "Weinig actief (zittend werk, geen sport)", multiplier: 1.2 },
  { key: "light", label: "Licht actief (af en toe sport of wandelen)", multiplier: 1.375 },
  { key: "moderate", label: "Matig actief (3–5x per week sporten)", multiplier: 1.55 },
  { key: "active", label: "Actief (dagelijks sport of fysiek werk)", multiplier: 1.725 },
  { key: "very_active", label: "Zeer actief (zwaar fysiek werk + sport)", multiplier: 1.9 },
];

export const GOAL_PLANS: {
  key: GoalPlan;
  label: string;
  /** kcal t.o.v. TDEE (onderhoud) */
  calorieAdjustment: number;
  proteinPerKg: number;
  fatPct: number;
}[] = [
  // -600 kcal komt overeen met het in de app zelf genoemde verwachte verlies van 0,5-0,7 kg/week.
  { key: "afvallen", label: "Afvallen", calorieAdjustment: -600, proteinPerKg: 2.0, fatPct: 0.25 },
  { key: "onderhoud", label: "Onderhoud", calorieAdjustment: 0, proteinPerKg: 1.6, fatPct: 0.3 },
  { key: "spieropbouw", label: "Spieropbouw", calorieAdjustment: 300, proteinPerKg: 2.0, fatPct: 0.25 },
];

/** Algemene richtwaarden per geslacht — zie constants.ts voor de bron/toelichting. */
const MICRONUTRIENT_RDA: Record<Sex, MicronutrientTargetFields> = {
  male: {
    vitamin_d_mcg: 15,
    magnesium_mg: 400,
    vitamin_b1_mg: 1.2,
    vitamin_b6_mg: 1.5,
    vitamin_b12_mcg: 3.2,
    omega3_mg: 375,
    zinc_mg: 11,
    potassium_mg: 4100,
    calcium_mg: 1000,
    iron_mg: 9.5,
  },
  female: {
    vitamin_d_mcg: 15,
    magnesium_mg: 310,
    vitamin_b1_mg: 1.1,
    vitamin_b6_mg: 1.5,
    vitamin_b12_mcg: 3.2,
    omega3_mg: 375,
    zinc_mg: 8,
    potassium_mg: 3500,
    calcium_mg: 1000,
    iron_mg: 18,
  },
};

export function calculateAge(birthDateISO: string, onDateISO: string): number {
  return differenceInYears(new Date(`${onDateISO}T00:00:00`), new Date(`${birthDateISO}T00:00:00`));
}

/** Mifflin-St Jeor — de huidige standaardformule voor rustmetabolisme (BMR). */
export function calculateBmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export interface RecommendedTargetsInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goal: GoalPlan;
}

export interface RecommendedTargets extends MicronutrientTargetFields {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  water_ml: number;
}

const FIBER_PER_1000KCAL = 14;
const WATER_ML_PER_KG = 33;

export function calculateRecommendedTargets(input: RecommendedTargetsInput): RecommendedTargets {
  const activity = ACTIVITY_LEVELS.find((a) => a.key === input.activityLevel) ?? ACTIVITY_LEVELS[1];
  const goal = GOAL_PLANS.find((g) => g.key === input.goal) ?? GOAL_PLANS[1];

  const bmr = calculateBmr(input.weightKg, input.heightCm, input.age, input.sex);
  const tdee = bmr * activity.multiplier;
  const calories = Math.round(tdee + goal.calorieAdjustment);

  const protein = Math.round(goal.proteinPerKg * input.weightKg);
  const fatCalories = calories * goal.fatPct;
  const fat = Math.round(fatCalories / 9);
  const proteinCalories = protein * 4;
  const carbs = Math.max(0, Math.round((calories - proteinCalories - fatCalories) / 4));
  const fiber = Math.round((calories / 1000) * FIBER_PER_1000KCAL);
  const water = Math.round(input.weightKg * WATER_ML_PER_KG);

  return {
    calories_kcal: calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    fiber_g: fiber,
    water_ml: water,
    ...MICRONUTRIENT_RDA[input.sex],
  };
}
