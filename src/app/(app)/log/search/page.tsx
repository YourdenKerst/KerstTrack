"use client";

import { Loader2, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ScannedProductReview } from "@/components/food/ScannedProductReview";
import { Input } from "@/components/ui";
import { todayISO } from "@/lib/date";
import { searchProductsByName, type OpenFoodFactsProduct } from "@/lib/openFoodFacts";
import { useAddFoodItem, useFoodItems } from "@/lib/queries/foodItems";
import { useLogFoodItem } from "@/lib/queries/foodLogs";
import type { FoodItem } from "@/lib/types";
import { useUserId } from "@/lib/user-context";

function toOffShape(item: FoodItem): OpenFoodFactsProduct {
  const factor = 100 / item.reference_grams;
  return {
    barcode: item.barcode ?? "",
    name: item.name,
    imageUrl: item.image_url,
    caloriesKcal: item.calories_kcal * factor,
    proteinG: item.protein_g * factor,
    carbsG: item.carbs_g * factor,
    fatG: item.fat_g * factor,
    fiberG: item.fiber_g * factor,
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
  const searchParams = useSearchParams();
  const dateISO = searchParams.get("date") ?? todayISO();
  const { data: items } = useFoodItems(userId);
  const logItem = useLogFoodItem(userId);
  const addFoodItem = useAddFoodItem(userId);

  const [query, setQuery] = useState("");
  const [offResults, setOffResults] = useState<OpenFoodFactsProduct[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [reviewing, setReviewing] = useState<{ product: OpenFoodFactsProduct; existingItemId: string | null } | null>(
    null,
  );
  const [loggedKey, setLoggedKey] = useState<string | null>(null);
  const [logError, setLogError] = useState(false);

  const localMatches = (items ?? []).filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }
    const timeout = window.setTimeout(async () => {
      setOffLoading(true);
      try {
        const results = await searchProductsByName(trimmed);
        const localBarcodes = new Set((items ?? []).map((i) => i.barcode).filter(Boolean));
        setOffResults(results.filter((r) => !localBarcodes.has(r.barcode)));
      } finally {
        setOffLoading(false);
      }
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [query, items]);

  async function handleConfirm(grams: number) {
    if (!reviewing) return;
    const { product, existingItemId } = reviewing;
    setLogError(false);

    try {
      if (existingItemId) {
        const item = (items ?? []).find((i) => i.id === existingItemId);
        if (item) await logItem.mutateAsync({ item, logDate: dateISO, grams });
      } else {
        const item = await addFoodItem.mutateAsync({
          name: product.name ?? "Product",
          barcode: product.barcode || null,
          image_url: product.imageUrl,
          calories_kcal: product.caloriesKcal ?? 0,
          protein_g: product.proteinG ?? 0,
          carbs_g: product.carbsG ?? 0,
          fat_g: product.fatG ?? 0,
          fiber_g: product.fiberG ?? 0,
          reference_grams: 100,
        });
        await logItem.mutateAsync({ item, logDate: dateISO, grams });
      }

      setLoggedKey(existingItemId ?? product.barcode);
      setReviewing(null);
      window.setTimeout(() => setLoggedKey(null), 1500);
    } catch {
      setLogError(true);
    }
  }

  if (reviewing) {
    return (
      <div className="space-y-2">
        <ScannedProductReview
          product={reviewing.product}
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
          placeholder="Zoek een product op naam…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {!items || items.length === 0 || localMatches.length === 0 ? null : (
        <div>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Jouw producten
          </h2>
          <ul className="divide-y divide-border">
            {localMatches.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setReviewing({ product: toOffShape(item), existingItemId: item.id })}
                  className="flex w-full items-center gap-3 py-2.5 text-left transition-colors active:bg-surface-muted"
                >
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- eigen/OFF-afbeelding, geen build-time optimalisatie nodig
                    <img src={item.image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover" />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-surface-muted" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{item.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {Math.round(item.calories_kcal)} kcal · {Math.round(item.protein_g)}p / {Math.round(item.carbs_g)}k /{" "}
                      {Math.round(item.fat_g)}v
                    </span>
                  </span>
                  {loggedKey === item.id && <span className="shrink-0 text-xs font-medium text-success">Gelogd!</span>}
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
          {offResults.length === 0 && !offLoading && (
            <p className="py-2 text-sm text-muted-foreground">Niets gevonden.</p>
          )}
          <ul className="divide-y divide-border">
            {offResults.map((product) => (
              <li key={product.barcode}>
                <button
                  type="button"
                  onClick={() => setReviewing({ product, existingItemId: null })}
                  className="flex w-full items-center gap-3 py-2.5 text-left transition-colors active:bg-surface-muted"
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
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {Math.round(product.caloriesKcal ?? 0)} kcal/100g
                    </span>
                  </span>
                  {loggedKey === product.barcode && <span className="shrink-0 text-xs font-medium text-success">Gelogd!</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!items && <p className="py-6 text-center text-sm text-muted-foreground">Laden…</p>}
      {items && items.length === 0 && query.trim().length < 2 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Typ een naam om te zoeken — zowel in je eigen producten als in Open Food Facts.
        </p>
      )}
    </div>
  );
}
