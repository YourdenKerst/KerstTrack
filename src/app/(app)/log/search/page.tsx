"use client";

import { Heart, Loader2, Search, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ScannedProductReview } from "@/components/food/ScannedProductReview";
import { Input } from "@/components/ui";
import { dashboardHref, todayISO } from "@/lib/date";
import { scaleProductToGrams, searchProductsByName, type OpenFoodFactsProduct } from "@/lib/openFoodFacts";
import { useAddFoodItem, useDeleteFoodItem, useFoodItems, useSetFoodItemFavorite } from "@/lib/queries/foodItems";
import { useAddFoodLog, useLogFoodItem } from "@/lib/queries/foodLogs";
import type { FoodItem } from "@/lib/types";
import { useUserId } from "@/lib/user-context";

function toOffShape(item: FoodItem): OpenFoodFactsProduct {
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

export default function SearchFoodPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground">Laden…</div>}>
      <SearchFoodPageContent />
    </Suspense>
  );
}

function SearchFoodPageContent() {
  const userId = useUserId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateISO = searchParams.get("date") ?? todayISO();
  const { data: items } = useFoodItems(userId);
  const logItem = useLogFoodItem(userId);
  const addFoodLog = useAddFoodLog(userId);
  const addFoodItem = useAddFoodItem(userId);
  const setFavorite = useSetFoodItemFavorite(userId);
  const deleteFoodItem = useDeleteFoodItem(userId);

  const [query, setQuery] = useState("");
  const [offResults, setOffResults] = useState<OpenFoodFactsProduct[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [reviewing, setReviewing] = useState<{ product: OpenFoodFactsProduct; existingItemId: string | null } | null>(
    null,
  );
  const [logError, setLogError] = useState(false);

  const favorites = (items ?? []).filter((item) => item.is_favorite);
  const queryLower = query.trim().toLowerCase();
  const localMatches = favorites.filter(
    (item) => item.name.toLowerCase().includes(queryLower) || item.brand?.toLowerCase().includes(queryLower),
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }
    const timeout = window.setTimeout(async () => {
      setOffLoading(true);
      try {
        const results = await searchProductsByName(trimmed);
        setOffResults(results);
      } finally {
        setOffLoading(false);
      }
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [query]);

  // Verberg een OFF-resultaat alleen als het al favoriet is (dan staat het al
  // hierboven bij Favorieten) — een bestaande, niet-favoriete rij (bv. eerder
  // ontfavoriet) mag hier blijven staan zodat hij opnieuw gefavoriet kan worden.
  const favoritedBarcodes = new Set(favorites.map((item) => item.barcode).filter(Boolean));
  const visibleOffResults = offResults.filter((r) => !favoritedBarcodes.has(r.barcode));

  function findLocalByBarcode(barcode: string): FoodItem | null {
    if (!barcode) return null;
    return (items ?? []).find((i) => i.barcode === barcode) ?? null;
  }

  async function toggleFavorite(product: OpenFoodFactsProduct, existingItemId: string | null) {
    const existing = existingItemId ? (items ?? []).find((i) => i.id === existingItemId) : findLocalByBarcode(product.barcode);
    if (existing) {
      await setFavorite.mutateAsync({ id: existing.id, is_favorite: !existing.is_favorite });
      return existing.id;
    }
    const created = await addFoodItem.mutateAsync({
      name: product.name ?? "Product",
      brand: product.brand,
      barcode: product.barcode || null,
      image_url: product.imageUrl,
      calories_kcal: product.caloriesKcal ?? 0,
      protein_g: product.proteinG ?? 0,
      carbs_g: product.carbsG ?? 0,
      fat_g: product.fatG ?? 0,
      fiber_g: product.fiberG ?? 0,
      reference_grams: 100,
      unit: product.unit,
      serving_size: product.servingSize,
      is_favorite: true,
    });
    return created.id;
  }

  async function handleToggleFavoriteInReview() {
    if (!reviewing) return;
    const id = await toggleFavorite(reviewing.product, reviewing.existingItemId);
    setReviewing({ ...reviewing, existingItemId: id });
  }

  async function handleConfirm(amount: number) {
    if (!reviewing) return;
    const { product, existingItemId } = reviewing;
    setLogError(false);

    try {
      const item = existingItemId ? (items ?? []).find((i) => i.id === existingItemId) : null;
      if (item) {
        await logItem.mutateAsync({ item, logDate: dateISO, grams: amount });
      } else {
        const scaled = scaleProductToGrams(
          {
            caloriesKcal: product.caloriesKcal ?? 0,
            proteinG: product.proteinG ?? 0,
            carbsG: product.carbsG ?? 0,
            fatG: product.fatG ?? 0,
            fiberG: product.fiberG ?? 0,
          },
          amount,
        );
        await addFoodLog.mutateAsync({
          food_item_id: null,
          recipe_id: null,
          name: product.brand ? `${product.name} (${product.brand})` : (product.name ?? "Product"),
          image_url: product.imageUrl,
          ingredient_count: null,
          calories_kcal: scaled.caloriesKcal,
          protein_g: scaled.proteinG,
          carbs_g: scaled.carbsG,
          fat_g: scaled.fatG,
          fiber_g: scaled.fiberG,
          log_date: dateISO,
        });
      }

      router.push(dashboardHref(dateISO));
    } catch {
      setLogError(true);
    }
  }

  if (reviewing) {
    const isFavorited = reviewing.existingItemId
      ? Boolean((items ?? []).find((i) => i.id === reviewing.existingItemId)?.is_favorite)
      : false;
    return (
      <div className="space-y-2">
        <ScannedProductReview
          product={reviewing.product}
          isFavorited={isFavorited}
          onToggleFavorite={handleToggleFavoriteInReview}
          onCancel={() => setReviewing(null)}
          onConfirm={handleConfirm}
        />
        {logError && (
          <p className="text-center text-sm text-danger">
            Opslaan is niet gelukt. Probeer het opnieuw — als dit blijft gebeuren, is de database mogelijk nog niet
            bijgewerkt.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Zoek op naam of merk…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {favorites.length === 0 || localMatches.length === 0 ? null : (
        <div>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Favorieten</h2>
          <ul className="divide-y divide-border">
            {localMatches.map((item) => (
              <li key={item.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setReviewing({ product: toOffShape(item), existingItemId: item.id })}
                  className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left transition-colors active:bg-surface-muted"
                >
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- eigen/OFF-afbeelding, geen build-time optimalisatie nodig
                    <img src={item.image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover" />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-surface-muted" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {item.name}
                      {item.brand && <span className="font-normal text-muted-foreground"> · {item.brand}</span>}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {Math.round(item.calories_kcal)} kcal · {Math.round(item.protein_g)}p / {Math.round(item.carbs_g)}k /{" "}
                      {Math.round(item.fat_g)}v
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFavorite.mutate({ id: item.id, is_favorite: false })}
                  aria-label="Verwijder uit favorieten"
                  className="shrink-0 rounded-full p-2 text-muted-foreground active:bg-surface-muted"
                >
                  <Heart size={16} className="fill-danger text-danger" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`"${item.name}" definitief verwijderen?`)) deleteFoodItem.mutate(item.id);
                  }}
                  aria-label="Definitief verwijderen"
                  className="shrink-0 rounded-full p-2 text-muted-foreground active:bg-surface-muted active:text-danger"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {query.trim().length >= 2 && (
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Open Food Facts
            {offLoading && <Loader2 size={12} className="animate-spin" />}
          </h2>
          {visibleOffResults.length === 0 && !offLoading && (
            <p className="py-2 text-sm text-muted-foreground">Niets gevonden.</p>
          )}
          <ul className="divide-y divide-border">
            {visibleOffResults.map((product) => {
              const localMatch = findLocalByBarcode(product.barcode);
              return (
                <li key={product.barcode} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setReviewing({ product, existingItemId: localMatch?.id ?? null })}
                    className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left transition-colors active:bg-surface-muted"
                  >
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- extern OFF-domein, geen build-time optimalisatie nodig
                      <img src={product.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover" />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-surface-muted" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {product.name ?? "Onbekend product"}
                        {product.brand && <span className="font-normal text-muted-foreground"> · {product.brand}</span>}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {Math.round(product.caloriesKcal ?? 0)} kcal/100{product.unit}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(product, localMatch?.id ?? null)}
                    aria-label="Favoriet maken"
                    className="shrink-0 rounded-full p-2 text-muted-foreground active:bg-surface-muted"
                  >
                    <Heart size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!items && <p className="py-6 text-center text-sm text-muted-foreground">Laden…</p>}
      {items && favorites.length === 0 && query.trim().length < 2 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Typ een naam of merk om te zoeken — zowel in je favorieten als in Open Food Facts. Tik op het hartje om iets
          te bewaren als favoriet.
        </p>
      )}
    </div>
  );
}
