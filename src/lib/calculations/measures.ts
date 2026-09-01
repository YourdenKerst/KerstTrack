export type MeasureKind = "portion" | "fixed" | "manual";

export interface MeasureOption {
  key: string;
  label: string;
  kind: MeasureKind;
  /** Alleen voor "portion"/"fixed" — hoeveel g/ml één stuk van deze maat is. */
  gramsPerUnit?: number;
  unit: "g" | "ml";
}

// Vaste, algemene maten naast de portiegrootte uit Open Food Facts — bewuste
// keuze, geen uitputtende lijst: dit zijn de maten die in de praktijk het
// vaakst gebruikt worden, met zowel een gewicht- (eetlepel/theelepel) als een
// volume-maat (glas) erbij.
const FIXED_MEASURES: MeasureOption[] = [
  { key: "eetlepel", label: "Eetlepel (15g)", kind: "fixed", gramsPerUnit: 15, unit: "g" },
  { key: "theelepel", label: "Theelepel (5g)", kind: "fixed", gramsPerUnit: 5, unit: "g" },
  { key: "glas", label: "Glas (250ml)", kind: "fixed", gramsPerUnit: 250, unit: "ml" },
];

const MANUAL_MEASURES: MeasureOption[] = [
  { key: "gram", label: "Gram", kind: "manual", unit: "g" },
  { key: "ml", label: "ML", kind: "manual", unit: "ml" },
];

/** Portie staat vooraan en is de standaardkeuze — maar alleen als OFF een bruikbare portiegrootte gaf. */
export function buildMeasureOptions(servingSize: number | null, servingUnit: "g" | "ml"): MeasureOption[] {
  const options: MeasureOption[] = [];
  if (servingSize != null && servingSize > 0) {
    options.push({
      key: "portion",
      label: `Portie (${servingSize}${servingUnit})`,
      kind: "portion",
      gramsPerUnit: servingSize,
      unit: servingUnit,
    });
  }
  options.push(...FIXED_MEASURES, ...MANUAL_MEASURES);
  return options;
}

export function defaultMeasureKey(options: MeasureOption[]): string {
  return options[0]?.key ?? "gram";
}

export function findMeasure(options: MeasureOption[], key: string): MeasureOption {
  return options.find((o) => o.key === key) ?? options[0];
}

/** Rekent een "aantal van deze maat" om naar de uiteindelijke hoeveelheid + eenheid om op te slaan. */
export function computeMeasureResult(option: MeasureOption, count: number): { amount: number; unit: "g" | "ml" } {
  const amount = option.kind === "manual" ? count : count * (option.gramsPerUnit ?? 1);
  return { amount: Math.round(amount * 100) / 100, unit: option.unit };
}
