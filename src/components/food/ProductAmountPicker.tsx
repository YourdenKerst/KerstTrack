"use client";

import { Heart, X } from "lucide-react";
import { useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import {
  buildMeasureOptions,
  computeMeasureResult,
  defaultMeasureKey,
  findMeasure,
} from "@/lib/calculations/measures";
import { MEAL_CATEGORY_LABELS, MEAL_CATEGORY_ORDER, defaultMealCategoryForTime } from "@/lib/calculations/mealBuckets";
import { scaleProductToGrams, type OpenFoodFactsProduct } from "@/lib/openFoodFacts";
import type { MealCategory, Unit } from "@/lib/types";

export interface ProductAmountResult {
  amount: number;
  unit: Unit;
  mealCategory: MealCategory;
  servingSize: number | null;
  servingUnit: Unit | null;
}

/**
 * Volledig scherm (i.p.v. inline) omdat dit zowel het loggen van een nieuw
 * product als het achteraf aanpassen van een bestaande log bedient — beide
 * met dezelfde vaste volgorde: foto, naam, macro's, hoeveelheid+maat, maaltijd.
 */
export function ProductAmountPicker({
  product,
  isFavorited,
  onToggleFavorite,
  initialMealCategory,
  initialMeasureKey,
  initialCount,
  confirmLabel = "Loggen",
  error,
  onConfirm,
  onCancel,
}: {
  product: OpenFoodFactsProduct;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  initialMealCategory?: MealCategory;
  initialMeasureKey?: string;
  initialCount?: number;
  confirmLabel?: string;
  error?: string | null;
  onConfirm: (result: ProductAmountResult) => void;
  onCancel: () => void;
}) {
  const options = buildMeasureOptions(product.servingSize, product.unit);
  const [measureKey, setMeasureKey] = useState(initialMeasureKey ?? defaultMeasureKey(options));
  const [count, setCount] = useState(initialCount ?? 1);
  const [mealCategory, setMealCategory] = useState<MealCategory>(initialMealCategory ?? defaultMealCategoryForTime());

  const option = findMeasure(options, measureKey);
  const { amount, unit } = computeMeasureResult(option, count);

  const scaled = scaleProductToGrams(
    {
      caloriesKcal: product.caloriesKcal,
      carbsG: product.carbsG,
      proteinG: product.proteinG,
      fatG: product.fatG,
    },
    amount,
  );

  function handleMeasureChange(newKey: string) {
    const newOption = findMeasure(options, newKey);
    setMeasureKey(newKey);
    setCount(newOption.kind === "manual" ? 100 : 1);
  }

  function handleConfirm() {
    onConfirm({
      amount,
      unit,
      mealCategory,
      servingSize: option.kind === "portion" ? option.gramsPerUnit ?? null : null,
      servingUnit: option.kind === "portion" ? option.unit : null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-end p-4 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Sluiten"
          className="rounded-full p-2 text-muted-foreground active:bg-surface-muted"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <div className="flex flex-col items-center gap-2 text-center">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- extern OFF-domein, geen build-time optimalisatie nodig
            <img src={product.imageUrl} alt="" className="h-28 w-28 rounded-2xl border border-border object-cover" />
          ) : (
            <div className="h-28 w-28 rounded-2xl bg-surface-muted" />
          )}
          <div>
            <h2 className="text-base font-semibold text-foreground">{product.name ?? "Product"}</h2>
            {product.brand && <p className="text-xs text-muted-foreground">{product.brand}</p>}
          </div>
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorited ? "Verwijder uit favorieten" : "Favoriet maken"}
              className="rounded-full p-2 text-muted-foreground active:bg-surface-muted"
            >
              <Heart size={20} className={isFavorited ? "fill-danger text-danger" : ""} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded-lg bg-surface-muted p-2">
            <div className="font-semibold text-foreground">{Math.round(scaled.caloriesKcal ?? 0)}</div>
            <div className="text-muted-foreground">kcal</div>
          </div>
          <div className="rounded-lg bg-surface-muted p-2">
            <div className="font-semibold text-foreground">{Math.round(scaled.carbsG ?? 0)}g</div>
            <div className="text-muted-foreground">koolh.</div>
          </div>
          <div className="rounded-lg bg-surface-muted p-2">
            <div className="font-semibold text-foreground">{Math.round(scaled.proteinG ?? 0)}g</div>
            <div className="text-muted-foreground">eiwit</div>
          </div>
          <div className="rounded-lg bg-surface-muted p-2">
            <div className="font-semibold text-foreground">{Math.round(scaled.fatG ?? 0)}g</div>
            <div className="text-muted-foreground">vet</div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex gap-2">
            <div className="w-20">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={count}
                onChange={(e) => setCount(Number(e.target.value) || 0)}
                aria-label="Aantal"
              />
            </div>
            <div className="flex-1">
              <Select value={measureKey} onChange={(e) => handleMeasureChange(e.target.value)} aria-label="Maat">
                {options.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {option.kind !== "manual" && (
            <p className="text-[11px] text-muted-foreground">
              = {amount}
              {unit}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Gegeten als</label>
          <Select value={mealCategory} onChange={(e) => setMealCategory(e.target.value as MealCategory)}>
            {MEAL_CATEGORY_ORDER.map((category) => (
              <option key={category} value={category}>
                {MEAL_CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {error && <p className="text-center text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" fullWidth onClick={handleConfirm} disabled={amount <= 0}>
            {confirmLabel}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuleren
          </Button>
        </div>
      </div>
    </div>
  );
}
