"use client";

import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { scaleProductToGrams, type OpenFoodFactsProduct } from "@/lib/openFoodFacts";
import type { FoodLogFormValues } from "./FoodLogForm";

export function ScannedProductReview({
  product,
  onConfirm,
  onCancel,
}: {
  product: OpenFoodFactsProduct;
  onConfirm: (values: FoodLogFormValues) => void;
  onCancel: () => void;
}) {
  const [grams, setGrams] = useState(100);

  const scaled = scaleProductToGrams(
    {
      caloriesKcal: product.caloriesKcal,
      proteinG: product.proteinG,
      carbsG: product.carbsG,
      fatG: product.fatG,
      fiberG: product.fiberG,
      vitaminDMcg: product.vitaminDMcg,
      magnesiumMg: product.magnesiumMg,
      vitaminB1Mg: product.vitaminB1Mg,
      vitaminB6Mg: product.vitaminB6Mg,
      vitaminB12Mcg: product.vitaminB12Mcg,
      omega3Mg: product.omega3Mg,
      zincMg: product.zincMg,
      potassiumMg: product.potassiumMg,
      calciumMg: product.calciumMg,
      ironMg: product.ironMg,
    },
    grams,
  );

  function handleConfirm() {
    onConfirm({
      name: product.name ?? "Gescand product",
      calories_kcal: scaled.caloriesKcal ?? 0,
      protein_g: scaled.proteinG ?? 0,
      carbs_g: scaled.carbsG ?? 0,
      fat_g: scaled.fatG ?? 0,
      fiber_g: scaled.fiberG ?? 0,
      saveAsFavorite: true,
      reference_grams: grams,
      vitamin_d_mcg: scaled.vitaminDMcg,
      magnesium_mg: scaled.magnesiumMg,
      vitamin_b1_mg: scaled.vitaminB1Mg,
      vitamin_b6_mg: scaled.vitaminB6Mg,
      vitamin_b12_mcg: scaled.vitaminB12Mcg,
      omega3_mg: scaled.omega3Mg,
      zinc_mg: scaled.zincMg,
      potassium_mg: scaled.potassiumMg,
      calcium_mg: scaled.calciumMg,
      iron_mg: scaled.ironMg,
    });
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        {product.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- extern OFF-domein, één kleine thumbnail, geen optimalisatie nodig
          <img
            src={product.imageUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover"
          />
        )}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">{product.name ?? "Gescand product"}</h2>
          <p className="text-xs text-muted-foreground">Gevonden via Open Food Facts — pas de hoeveelheid aan.</p>
        </div>
      </div>

      <div>
        <Label htmlFor="scan-grams">Hoeveelheid (g)</Label>
        <Input
          id="scan-grams"
          type="number"
          inputMode="decimal"
          min={1}
          step="any"
          value={grams}
          onChange={(e) => setGrams(Number(e.target.value) || 0)}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-surface-muted p-2">
          <div className="font-semibold text-foreground">{Math.round(scaled.caloriesKcal ?? 0)}</div>
          <div className="text-muted-foreground">kcal</div>
        </div>
        <div className="rounded-lg bg-surface-muted p-2">
          <div className="font-semibold text-foreground">{Math.round(scaled.proteinG ?? 0)}g</div>
          <div className="text-muted-foreground">eiwit</div>
        </div>
        <div className="rounded-lg bg-surface-muted p-2">
          <div className="font-semibold text-foreground">{Math.round(scaled.carbsG ?? 0)}g</div>
          <div className="text-muted-foreground">koolh.</div>
        </div>
      </div>

      {product.hasEstimatedNutrients && (
        <p className="rounded-lg bg-warning-bg px-3 py-2 text-xs text-foreground">
          Sommige voedingsstoffen zijn een schatting van Open Food Facts op basis van ingrediënten, niet van het
          etiket — controleer ze in de volgende stap.
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" fullWidth onClick={handleConfirm}>
          Doorgaan
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuleren
        </Button>
      </div>
    </Card>
  );
}
