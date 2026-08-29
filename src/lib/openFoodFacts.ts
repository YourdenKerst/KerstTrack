// Open Food Facts-client: haalt voedingswaarden per 100g op via barcode of naam.
// Zie https://openfoodfacts.github.io/openfoodfacts-server/api/ — geen API-key nodig,
// wel een beschrijvende User-Agent (vereist door hun fair-use-beleid).
// Barcode-opzoeken gebruikt het nl-subdomein (Nederlandse productnamen als voorkeur).
// Naam-zoeken gebruikt search-a-licious (search.openfoodfacts.org) — de v2/v3 API
// heeft geen full-text zoeken, en de oude /cgi/search.pl-endpoint is niet meer in de lucht.

export interface OpenFoodFactsProduct {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  /** Eenheid waarin de portiegrootte (en dus het loggen) getoond moet worden. */
  unit: "g" | "ml";
  /** Portiegrootte in `unit`, bv. 6 voor "1 portie = 6g" — null als OFF niets bruikbaars meegeeft. */
  servingSize: number | null;
}

type NutrientMap = Record<string, number | string | undefined>;

const USER_AGENT = "PersoonlijkeTrackerPWA/1.0 (single-user, niet-commercieel)";

function readMacro(nutriments: NutrientMap, key: string): number | null {
  const value = nutriments[`${key}_100g`];
  return typeof value === "number" ? value : null;
}

/** Herkent "30 g", "250ml", "1 cookie (15 g)" e.d. — pakt het eerste getal+eenheid-paar. */
function parseServingSize(text: string | undefined): { amount: number; unit: "g" | "ml" } | null {
  if (!text) return null;
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(ml|milliliter|millilitre|g|gram|grams?)\b/i);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit: "g" | "ml" = match[2].toLowerCase().startsWith("ml") || match[2].toLowerCase().startsWith("milli") ? "ml" : "g";
  return { amount, unit };
}

/**
 * `brands` is een komma-gescheiden string op de v2-productendpoint (barcode-
 * opzoeken), maar een array op search-a-licious (naam-zoeken) — vandaar dat
 * beide vormen hier afgehandeld worden i.p.v. alleen de string-vorm.
 */
function firstBrand(brands: unknown): string | null {
  if (Array.isArray(brands)) {
    return typeof brands[0] === "string" ? brands[0].trim() || null : null;
  }
  if (typeof brands === "string") {
    return brands.split(",")[0]?.trim() || null;
  }
  return null;
}

function toProduct(barcode: string, product: Record<string, unknown>): OpenFoodFactsProduct {
  const nutriments = (product.nutriments ?? {}) as NutrientMap;
  const brand = firstBrand(product.brands);

  const servingQuantity = Number(product.serving_quantity);
  const servingSizeText = product.serving_size as string | undefined;
  const parsedServing = parseServingSize(servingSizeText);
  const serving =
    Number.isFinite(servingQuantity) && servingQuantity > 0
      ? { amount: servingQuantity, unit: parsedServing?.unit ?? "g" }
      : parsedServing;

  return {
    barcode,
    name: (product.product_name || product.product_name_nl || product.generic_name || null) as string | null,
    brand,
    imageUrl: (product.image_front_small_url || product.image_front_url || product.image_url || null) as
      | string
      | null,
    caloriesKcal: readMacro(nutriments, "energy-kcal"),
    proteinG: readMacro(nutriments, "proteins"),
    carbsG: readMacro(nutriments, "carbohydrates"),
    fatG: readMacro(nutriments, "fat"),
    fiberG: readMacro(nutriments, "fiber"),
    unit: serving?.unit ?? "g",
    servingSize: serving?.amount ?? null,
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

/**
 * Zoekt producten op naam. Loopt via onze eigen /api/off-search-route in
 * plaats van rechtstreeks search.openfoodfacts.org aan te roepen — die
 * stuurt geen Access-Control-Allow-Origin voor externe domeinen, dus een
 * rechtstreekse browser-fetch wordt door CORS geblokkeerd (bevestigd via
 * curl: wel access-control-allow-credentials, geen -allow-origin).
 */
export async function searchProductsByName(query: string, limit = 15): Promise<OpenFoodFactsProduct[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const response = await fetch(`/api/off-search?q=${encodeURIComponent(trimmed)}&limit=${limit}`);
    if (!response.ok) return [];

    const data = await response.json();
    const hits = (data.hits ?? []) as Record<string, unknown>[];
    // Eén onverwacht veld-formaat in één hit mag niet de hele zoekopdracht
    // laten mislukken — zie de firstBrand-fix hierboven (search-a-licious
    // gaf `brands` als array, .split() daarop gooide en de buitenste
    // try/catch ving dat op als "niets gevonden").
    const products: OpenFoodFactsProduct[] = [];
    for (const hit of hits) {
      if (typeof hit.code !== "string") continue;
      try {
        products.push(toProduct(hit.code, hit));
      } catch {
        // sla alleen deze ene hit over
      }
    }
    return products;
  } catch {
    return [];
  }
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
