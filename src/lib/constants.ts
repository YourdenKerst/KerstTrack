import type { MicronutrientKey } from "@/lib/types";

export interface NutrientReference {
  name: string;
  amount: string;
  note?: string;
}

export interface MicronutrientMeta {
  key: MicronutrientKey;
  label: string;
  unit: string;
  /** Kleurtoken, mode-invariant (zie globals.css) — gedeeld met de status-kalendercellen. */
  colorVar: string;
}

/** Machine-leesbare tegenhanger van NUTRIENT_REFERENCES, voor de balkjes op dashboard/voeding. */
export const MICRONUTRIENT_META: MicronutrientMeta[] = [
  { key: "vitamin_d_mcg", label: "Vitamine D", unit: "mcg", colorVar: "var(--macro-calories)" },
  { key: "magnesium_mg", label: "Magnesium", unit: "mg", colorVar: "var(--macro-protein)" },
  { key: "vitamin_b1_mg", label: "Vitamine B1", unit: "mg", colorVar: "var(--macro-carbs)" },
  { key: "vitamin_b6_mg", label: "Vitamine B6", unit: "mg", colorVar: "var(--macro-fat)" },
  { key: "vitamin_b12_mcg", label: "Vitamine B12", unit: "mcg", colorVar: "var(--macro-fiber)" },
  { key: "omega3_mg", label: "Omega-3", unit: "mg", colorVar: "var(--macro-water)" },
  { key: "zinc_mg", label: "Zink", unit: "mg", colorVar: "var(--macro-calories)" },
  { key: "potassium_mg", label: "Kalium", unit: "mg", colorVar: "var(--macro-protein)" },
  { key: "calcium_mg", label: "Calcium", unit: "mg", colorVar: "var(--macro-carbs)" },
  { key: "iron_mg", label: "IJzer", unit: "mg", colorVar: "var(--macro-fat)" },
];

/** Algemene richtwaarden voor volwassen mannen — puur informatief, geen medisch advies. */
export const NUTRIENT_REFERENCES: NutrientReference[] = [
  {
    name: "Vitamine D",
    amount: "10–20 mcg (400–800 IU)",
    note: "Jouw supplement (2.000–3.000 IU) is een hogere, bewuste suppletiedosis — gangbaar in de winter of bij een vastgesteld tekort.",
  },
  { name: "Magnesium", amount: "350–400 mg" },
  { name: "Vitamine B1 (thiamine)", amount: "1,1–1,2 mg" },
  { name: "Vitamine B6", amount: "1,3–1,7 mg" },
  { name: "Vitamine B12", amount: "2,4–4 mcg" },
  { name: "Omega-3 (EPA + DHA)", amount: "250–500 mg" },
  { name: "Zink", amount: "11 mg" },
  { name: "Kalium", amount: "3.500–4.700 mg" },
  { name: "Calcium", amount: "1.000 mg" },
  { name: "IJzer", amount: "8–11 mg" },
];
