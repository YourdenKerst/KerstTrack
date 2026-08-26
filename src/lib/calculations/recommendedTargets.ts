import { differenceInYears } from "date-fns";
import type { Sex } from "@/lib/types";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalPlan = "afvallen" | "onderhoud" | "spieropbouw";

export const ACTIVITY_LEVELS: { key: ActivityLevel; label: string; multiplier: number }[] = [
  { key: "sedentary", label: "Weinig actief (zittend werk, geen sport)", multiplier: 1.2 },
  { key: "light", label: "Licht actief (af en toe sport of wandelen)", multiplier: 1.375 },
  { key: "moderate", label: "Matig actief (3–5x per week sporten)", multiplier: 1.55 },
  { key: "active", label: "Actief (dagelijks sport of fysiek werk)", multiplier: 1.725 },
  { key: "very_active", label: "Zeer actief (zwaar fysiek werk + sport)", multiplier: 1.9 },
];

export interface PaceRange {
  min: number;
  max: number;
  default: number;
  step: number;
  /** Vanaf deze waarde markeert de UI het tempo als agressiever/minder veilig (rood + disclaimer). */
  dangerAbove: number;
}

export interface GoalPlanDef {
  key: GoalPlan;
  label: string;
  /** -1 = afbouwen (deficit), 0 = onderhoud, 1 = opbouwen (surplus). */
  direction: -1 | 0 | 1;
  /** kg/week, alleen relevant als direction !== 0 — bepaalt hoe snel je je doel bereikt. */
  paceRange: PaceRange | null;
  proteinPerKg: number;
  fatPct: number;
}

export const GOAL_PLANS: GoalPlanDef[] = [
  {
    key: "afvallen",
    label: "Afvallen",
    direction: -1,
    paceRange: { min: 0.25, max: 1.5, default: 0.5, step: 0.05, dangerAbove: 1.0 },
    proteinPerKg: 2.0,
    fatPct: 0.25,
  },
  { key: "onderhoud", label: "Onderhoud", direction: 0, paceRange: null, proteinPerKg: 1.6, fatPct: 0.3 },
  {
    key: "spieropbouw",
    label: "Spieropbouw",
    direction: 1,
    paceRange: { min: 0.1, max: 0.4, default: 0.25, step: 0.05, dangerAbove: 0.35 },
    proteinPerKg: 2.0,
    fatPct: 0.25,
  },
];

/** Vuistregel: 1 kg lichaamsvet komt ongeveer overeen met 7700 kcal. */
const KCAL_PER_KG_BODYWEIGHT = 7700;

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
  /** kg/week — hoe snel je het doel wilt bereiken. Genegeerd bij "onderhoud". */
  paceKgPerWeek?: number;
}

export interface RecommendedTargets {
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
  const pace = goal.paceRange ? input.paceKgPerWeek ?? goal.paceRange.default : 0;
  const calorieAdjustment = Math.round((goal.direction * pace * KCAL_PER_KG_BODYWEIGHT) / 7);

  const bmr = calculateBmr(input.weightKg, input.heightCm, input.age, input.sex);
  const tdee = bmr * activity.multiplier;
  const calories = Math.round(tdee + calorieAdjustment);

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
  };
}
