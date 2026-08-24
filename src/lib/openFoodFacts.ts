// Open Food Facts-client: haalt voedingswaarden per 100g op via barcode.
// Zie https://openfoodfacts.github.io/openfoodfacts-server/api/ — geen API-key nodig,
// wel een beschrijvende User-Agent (vereist door hun fair-use-beleid).
// Gebruikt het nl-subdomein: zelfde wereldwijde database (barcodes zijn universeel),
// maar met Nederlandse productnamen/taal als voorkeur waar beschikbaar.

export interface OpenFoodFactsProduct {
  barcode: string;
  name: string | null;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  vitaminDMcg: number | null;
  magnesiumMg: number | null;
  vitaminB1Mg: number | null;
  vitaminB6Mg: number | null;
  vitaminB12Mcg: number | null;
  omega3Mg: number | null;
  zincMg: number | null;
  potassiumMg: number | null;
  calciumMg: number | null;
  ironMg: number | null;
  /** true als er minstens 1 micronutriënt alleen als OFF-ingrediëntenschatting beschikbaar was (niet van het etiket). */
  hasEstimatedNutrients: boolean;
}

type NutrientMap = Record<string, number | string | undefined>;

const USER_AGENT = "PersoonlijkeTrackerPWA/1.0 (single-user, niet-commercieel)";

function readMacro(nutriments: NutrientMap, key: string): number | null {
  const value = nutriments[`${key}_100g`];
  return typeof value === "number" ? value : null;
}

/** Zet een waarde + eenheid om naar mg. */
function toMg(value: number, unit: string): number | null {
  switch (unit) {
    case "g":
      return value * 1000;
    case "mg":
      return value;
    case "µg":
    case "mcg":
    case "ug":
      return value / 1000;
    default:
      return null;
  }
}

/**
 * Micronutriënt ophalen: eerst de echte (etiket-)waarde uit `nutriments` met
 * bijbehorende eenheid; als die ontbreekt, terugvallen op OFF's eigen
 * ingrediënten-gebaseerde schatting in `nutriments_estimated` (altijd in
 * gram). Meldt via de return of het om een schatting ging.
 */
function readMicronutrient(
  nutriments: NutrientMap,
  estimated: NutrientMap,
  key: string,
  targetUnit: "mg" | "mcg",
): { value: number | null; estimated: boolean } {
  const real = nutriments[`${key}_100g`];
  if (typeof real === "number") {
    const unit = String(nutriments[`${key}_unit`] ?? "g").toLowerCase();
    const mg = unit === "iu" && key === "vitamin-d" ? (real * 0.025) / 1000 : toMg(real, unit);
    if (mg !== null) {
      return { value: targetUnit === "mg" ? mg : mg * 1000, estimated: false };
    }
  }

  const est = estimated[`${key}_100g`];
  if (typeof est === "number") {
    const mg = est * 1000; // nutriments_estimated staat altijd in gram
    return { value: targetUnit === "mg" ? mg : mg * 1000, estimated: true };
  }

  return { value: null, estimated: false };
}

export async function lookupBarcodeProduct(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const url = `https://nl.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });

  if (!response.ok) return null;
  const data = await response.json();
  if (data.status !== 1 || !data.product) return null;

  const product = data.product;
  const nutriments: NutrientMap = product.nutriments ?? {};
  const estimated: NutrientMap = product.nutriments_estimated ?? {};

  const vitaminD = readMicronutrient(nutriments, estimated, "vitamin-d", "mcg");
  const magnesium = readMicronutrient(nutriments, estimated, "magnesium", "mg");
  const b1 = readMicronutrient(nutriments, estimated, "vitamin-b1", "mg");
  const b6 = readMicronutrient(nutriments, estimated, "vitamin-b6", "mg");
  const b12 = readMicronutrient(nutriments, estimated, "vitamin-b12", "mcg");
  const omega3 = readMicronutrient(nutriments, estimated, "omega-3-fat", "mg");
  const zinc = readMicronutrient(nutriments, estimated, "zinc", "mg");
  const potassium = readMicronutrient(nutriments, estimated, "potassium", "mg");
  const calcium = readMicronutrient(nutriments, estimated, "calcium", "mg");
  const iron = readMicronutrient(nutriments, estimated, "iron", "mg");

  return {
    barcode,
    name: product.product_name || product.product_name_nl || product.generic_name || null,
    caloriesKcal: readMacro(nutriments, "energy-kcal"),
    proteinG: readMacro(nutriments, "proteins"),
    carbsG: readMacro(nutriments, "carbohydrates"),
    fatG: readMacro(nutriments, "fat"),
    fiberG: readMacro(nutriments, "fiber"),
    vitaminDMcg: vitaminD.value,
    magnesiumMg: magnesium.value,
    vitaminB1Mg: b1.value,
    vitaminB6Mg: b6.value,
    vitaminB12Mcg: b12.value,
    omega3Mg: omega3.value,
    zincMg: zinc.value,
    potassiumMg: potassium.value,
    calciumMg: calcium.value,
    ironMg: iron.value,
    hasEstimatedNutrients: [vitaminD, magnesium, b1, b6, b12, omega3, zinc, potassium, calcium, iron].some(
      (n) => n.estimated && n.value !== null,
    ),
  };
}

/** Schaalt "per 100g"-waarden naar een opgegeven gewicht in gram. */
export function scaleProductToGrams<T extends Record<string, number | null | unknown>>(
  values: T,
  grams: number,
): T {
  const factor = grams / 100;
  const scaled = { ...values };
  for (const key of Object.keys(scaled)) {
    const value = scaled[key];
    if (typeof value === "number") {
      (scaled as Record<string, number>)[key] = Math.round(value * factor * 100) / 100;
    }
  }
  return scaled;
}
