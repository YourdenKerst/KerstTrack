// Open Food Facts-client: haalt voedingswaarden per 100g op via barcode of naam.
// Zie https://openfoodfacts.github.io/openfoodfacts-server/api/ — geen API-key nodig,
// wel een beschrijvende User-Agent (vereist door hun fair-use-beleid).
// Barcode-opzoeken gebruikt het nl-subdomein (Nederlandse productnamen als voorkeur).
// Naam-zoeken gebruikt search-a-licious (search.openfoodfacts.org) — de v2/v3 API
// heeft geen full-text zoeken, en de oude /cgi/search.pl-endpoint is niet meer in de lucht.

export interface OpenFoodFactsProduct {
  barcode: string;
  name: string | null;
  imageUrl: string | null;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
}

type NutrientMap = Record<string, number | string | undefined>;

const USER_AGENT = "PersoonlijkeTrackerPWA/1.0 (single-user, niet-commercieel)";

function readMacro(nutriments: NutrientMap, key: string): number | null {
  const value = nutriments[`${key}_100g`];
  return typeof value === "number" ? value : null;
}

function toProduct(barcode: string, product: Record<string, unknown>): OpenFoodFactsProduct {
  const nutriments = (product.nutriments ?? {}) as NutrientMap;
  return {
    barcode,
    name: (product.product_name || product.product_name_nl || product.generic_name || null) as string | null,
    imageUrl: (product.image_front_small_url || product.image_front_url || product.image_url || null) as
      | string
      | null,
    caloriesKcal: readMacro(nutriments, "energy-kcal"),
    proteinG: readMacro(nutriments, "proteins"),
    carbsG: readMacro(nutriments, "carbohydrates"),
    fatG: readMacro(nutriments, "fat"),
    fiberG: readMacro(nutriments, "fiber"),
  };
}

export async function lookupBarcodeProduct(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const url = `https://nl.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });

  if (!response.ok) return null;
  const data = await response.json();
  if (data.status !== 1 || !data.product) return null;

  return toProduct(barcode, data.product);
}

/** Zoekt producten op naam via search-a-licious. Geeft maximaal `limit` resultaten terug. */
export async function searchProductsByName(query: string, limit = 15): Promise<OpenFoodFactsProduct[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(trimmed)}&page_size=${limit}&fields=code,product_name,product_name_nl,generic_name,nutriments,image_front_small_url,image_front_url,image_url`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) return [];

  const data = await response.json();
  const hits = (data.hits ?? []) as Record<string, unknown>[];
  return hits
    .filter((hit) => typeof hit.code === "string")
    .map((hit) => toProduct(hit.code as string, hit));
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
