"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { scaleProductToGrams, type OpenFoodFactsProduct } from "@/lib/openFoodFacts";

type AmountMode = "manual" | "portions";

export function ScannedProductReview({
  product,
  isFavorited,
  onToggleFavorite,
  onConfirm,
  onCancel,
}: {
  product: OpenFoodFactsProduct;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}) {
  const hasServingSize = product.servingSize != null && product.servingSize > 0;
  const [mode, setMode] = useState<AmountMode>(hasServingSize ? "portions" : "manual");
  const [manualAmount, setManualAmount] = useState(100);
  const [portionCount, setPortionCount] = useState(1);

  const amount = mode === "portions" && hasServingSize ? (product.servingSize ?? 0) * portionCount : manualAmount;

  const scaled = scaleProductToGrams(
    {
      caloriesKcal: product.caloriesKcal,
      proteinG: product.proteinG,
      carbsG: product.carbsG,
      fatG: product.fatG,
    },
    amount,
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
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-foreground">{product.name ?? "Gescand product"}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {product.brand ? `${product.brand} · ` : ""}Gevonden via Open Food Facts
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={isFavorited ? "Verwijder uit favorieten" : "Favoriet maken"}
          className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors active:bg-surface-muted"
        >
          <Heart size={20} className={isFavorited ? "fill-danger text-danger" : ""} />
        </button>
      </div>

      {hasServingSize && (
        <div className="flex rounded-xl border border-border p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("portions")}
            className={`flex-1 rounded-lg py-1.5 font-medium transition-colors ${mode === "portions" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Porties
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`flex-1 rounded-lg py-1.5 font-medium transition-colors ${mode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Handmatig
          </button>
        </div>
      )}

      {mode === "portions" && hasServingSize ? (
        <div>
          <Label htmlFor="scan-portions">Aantal porties (1 portie = {product.servingSize}{product.unit})</Label>
          <Input
            id="scan-portions"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={portionCount}
            onChange={(e) => setPortionCount(Number(e.target.value) || 0)}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">= {Math.round(amount)}{product.unit}</p>
        </div>
      ) : (
        <div>
          <Label htmlFor="scan-amount">Hoeveelheid ({product.unit})</Label>
          <Input
            id="scan-amount"
            type="number"
            inputMode="decimal"
            min={1}
            step="any"
            value={manualAmount}
            onChange={(e) => setManualAmount(Number(e.target.value) || 0)}
          />
        </div>
      )}

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
        <Button type="button" fullWidth onClick={() => onConfirm(amount)} disabled={amount <= 0}>
          Loggen
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuleren
        </Button>
      </div>
    </Card>
  );
}
