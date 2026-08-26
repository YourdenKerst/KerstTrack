"use client";

import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { scaleProductToGrams, type OpenFoodFactsProduct } from "@/lib/openFoodFacts";

export function ScannedProductReview({
  product,
  onConfirm,
  onCancel,
}: {
  product: OpenFoodFactsProduct;
  onConfirm: (grams: number) => void;
  onCancel: () => void;
}) {
  const [grams, setGrams] = useState(100);

  const scaled = scaleProductToGrams(
    {
      caloriesKcal: product.caloriesKcal,
      proteinG: product.proteinG,
      carbsG: product.carbsG,
      fatG: product.fatG,
    },
    grams,
  );

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

      <div className="flex gap-2">
        <Button type="button" fullWidth onClick={() => onConfirm(grams)}>
          Loggen
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuleren
        </Button>
      </div>
    </Card>
  );
}
