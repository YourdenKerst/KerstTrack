// Open Food Facts-client: haalt voedingswaarden per 100g op via barcode of naam.
// Zie https://openfoodfacts.github.io/openfoodfacts-server/api/ — geen API-key nodig,
// wel een beschrijvende User-Agent (vereist door hun fair-use-beleid).
// Barcode-opzoeken gebruikt het nl-subdomein (Nederlandse productnamen als voorkeur).
// Naam-zoeken gebruikt search-a-licious (search.openfoodfacts.org) — de v2/v3 API
// heeft geen full-text zoeken, en de oude /cgi/search.pl-endpoint is niet meer in de lucht.

import type { FoodItem } from "@/lib/types";

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
 * Hoe vaak (en waar) de zoektermen daadwerkelijk in naam/merk voorkomen —
 * puur voor het sorteren van kandidaten die de strikte alle-termen-check in
 * `searchProductsByName` al gehaald hebben (naam weegt zwaarder dan merk).
 */
function relevanceScore(product: OpenFoodFactsProduct, queryWords: string[]): number {
  const nameLower = (product.name ?? "").toLowerCase();
  const brandLower = (product.brand ?? "").toLowerCase();
  let score = 0;
  for (const word of queryWords) {
    if (nameLower.includes(word)) score += 2;
    else if (brandLower.includes(word)) score += 1;
  }
  return score;
}

/** Houdt alleen Unicode-letters/cijfers over — voorkomt dat een woord met rare tekens de Lucene-query van OFF breekt. */
function sanitizeForFieldQuery(word: string): string {
  return word.replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * search-a-licious (Elasticsearch/Lucene) behandelt een kale meerwoordige
 * query als ÉÉN gescoorde tekstblob (match_phrase + multi_match, "should") —
 * niet als "elk woord moet ergens voorkomen". Bevestigd via curl tegen de
 * live API: `q=speculoos albert heijn` zet een product dat toevallig
 * "Albert Heijn" heet bovenaan, vóór echte speculoos-producten van dat merk
 * — en dat blijft zo bij een grotere page_size (het juiste product staat
 * domweg niet bij de eerste 50). Een `veld:waarde`-term (bv. `brands:heijn`)
 * wordt daarentegen een verplichte filter; zulke termen ANDen wél met elkaar
 * (bevestigd: een extra fout `brands:`-veld levert 0 resultaten op i.p.v.
 * ze te negeren). Door het/de laatste 1-2 woorden (vaak het merk, gezien
 * hoe mensen typen: "product merk") als `brands:`-filter te proberen, komt
 * het juiste product wél naar boven — bevestigd: `speculoos brands:albert
 * brands:heijn` geeft precies 1 hit, exact het gezochte product.
 *
 * Om niet te moeten raden óf de laatste woorden echt het merk zijn, worden
 * meerdere queryvarianten parallel opgevraagd (kale variant als vangnet +
 * laatste-1-woord- en laatste-2-woorden-als-merk-filter) en samengevoegd.
 * Als laatste, strikte correctheidscheck (en om varianten die té soepel
 * bleken te verifiëren) moet ELK zoekwoord alsnog ergens in naam+merk
 * voorkomen — anders valt het kandidaat alsnog af, precies zoals gevraagd.
 */
function buildQueryVariants(words: string[]): string[] {
  const variants = new Set<string>([words.join(" ")]);
  for (const k of [1, 2]) {
    if (words.length <= k) continue;
    const brandWords = words.slice(words.length - k).map(sanitizeForFieldQuery);
    if (brandWords.some((w) => !w)) continue;
    const rest = words.slice(0, words.length - k).join(" ");
    const brandClauses = brandWords.map((w) => `brands:${w}`).join(" ");
    variants.add(rest ? `${rest} ${brandClauses}` : brandClauses);
  }
  return [...variants];
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
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  try {
    const variants = buildQueryVariants(words);
    const responses = await Promise.all(
      variants.map(async (q) => {
        try {
          const response = await fetch(`/api/off-search?q=${encodeURIComponent(q)}&limit=${limit * 3}`);
          if (!response.ok) return [];
          const data = await response.json();
          return (data.hits ?? []) as Record<string, unknown>[];
        } catch {
          return [];
        }
      }),
    );

    // Eén onverwacht veld-formaat in één hit mag niet de hele zoekopdracht
    // laten mislukken — zie de firstBrand-fix hierboven (search-a-licious
    // gaf `brands` als array, .split() daarop gooide en de buitenste
    // try/catch ving dat op als "niets gevonden").
    const seenCodes = new Set<string>();
    const products: OpenFoodFactsProduct[] = [];
    for (const hits of responses) {
      for (const hit of hits) {
        if (typeof hit.code !== "string" || seenCodes.has(hit.code)) continue;
        seenCodes.add(hit.code);
        try {
          products.push(toProduct(hit.code, hit));
        } catch {
          // sla alleen deze ene hit over
        }
      }
    }

    return products
      .filter((product) => {
        const haystack = `${product.name ?? ""} ${product.brand ?? ""}`.toLowerCase();
        // Ook zonder spaties vergelijken — "albertheijn" moet nog steeds
        // matchen tegen een merk dat geïndexeerd staat als "Albert Heijn".
        const haystackNoSpaces = haystack.replace(/\s+/g, "");
        return words.every((word) => haystack.includes(word) || haystackNoSpaces.includes(word));
      })
      .map((product) => ({ product, score: relevanceScore(product, words) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ product }) => product);
  } catch {
    return [];
  }
}

/** Zet een opgeslagen product (favoriet/eigen item) om naar dezelfde "per 100"-vorm als een OFF-zoekresultaat. */
export function foodItemToProduct(item: FoodItem): OpenFoodFactsProduct {
  const factor = 100 / item.reference_grams;
  return {
    barcode: item.barcode ?? "",
    name: item.name,
    brand: item.brand,
    imageUrl: item.image_url,
    caloriesKcal: item.calories_kcal * factor,
    proteinG: item.protein_g * factor,
    carbsG: item.carbs_g * factor,
    fatG: item.fat_g * factor,
    fiberG: item.fiber_g * factor,
    unit: item.unit,
    servingSize: item.serving_size,
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
