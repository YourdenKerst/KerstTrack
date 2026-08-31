"use client";

import { Barcode, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BarcodeScanner } from "@/components/food/BarcodeScanner";
import { ScannedProductReview } from "@/components/food/ScannedProductReview";
import { dashboardHref, todayISO } from "@/lib/date";
import { lookupBarcodeProduct, scaleProductToGrams, type OpenFoodFactsProduct } from "@/lib/openFoodFacts";
import { useAddFoodItem, useFoodItems, useSetFoodItemFavorite, findFoodItemByBarcode } from "@/lib/queries/foodItems";
import { useAddFoodLog, useLogFoodItem } from "@/lib/queries/foodLogs";
import { useUserId } from "@/lib/user-context";

type ScanStatus = "idle" | "looking-up" | "not-found" | "error" | "log-error";

export default function ScanFoodPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground">Laden…</div>}>
      <ScanFoodPageContent />
    </Suspense>
  );
}

function ScanFoodPageContent() {
  const userId = useUserId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateISO = searchParams.get("date") ?? todayISO();
  const { data: items } = useFoodItems(userId);
  const logFoodItem = useLogFoodItem(userId);
  const addFoodLog = useAddFoodLog(userId);
  const addFoodItem = useAddFoodItem(userId);
  const setFavorite = useSetFoodItemFavorite(userId);

  const [scannerOpen, setScannerOpen] = useState(true);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [scannedProduct, setScannedProduct] = useState<OpenFoodFactsProduct | null>(null);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);

  async function handleDetected(barcode: string) {
    setScannerOpen(false);
    setStatus("looking-up");
    setScannedProduct(null);
    setSavedItemId(null);
    setNotFoundBarcode(null);

    try {
      const localMatch = await findFoodItemByBarcode(userId, barcode);
      if (localMatch) {
        await logFoodItem.mutateAsync({ item: localMatch, logDate: dateISO });
        router.push(dashboardHref(dateISO));
        return;
      }

      const product = await lookupBarcodeProduct(barcode);
      if (!product) {
        setNotFoundBarcode(barcode);
        setStatus("not-found");
        return;
      }
      setScannedProduct(product);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function handleToggleFavorite() {
    if (!scannedProduct) return;
    const existing = savedItemId ? (items ?? []).find((i) => i.id === savedItemId) : null;
    if (existing) {
      await setFavorite.mutateAsync({ id: existing.id, is_favorite: !existing.is_favorite });
      return;
    }
    const created = await addFoodItem.mutateAsync({
      name: scannedProduct.name ?? "Gescand product",
      brand: scannedProduct.brand,
      barcode: scannedProduct.barcode,
      image_url: scannedProduct.imageUrl,
      calories_kcal: scannedProduct.caloriesKcal ?? 0,
      protein_g: scannedProduct.proteinG ?? 0,
      carbs_g: scannedProduct.carbsG ?? 0,
      fat_g: scannedProduct.fatG ?? 0,
      fiber_g: scannedProduct.fiberG ?? 0,
      reference_grams: 100,
      unit: scannedProduct.unit,
      serving_size: scannedProduct.servingSize,
      is_favorite: true,
    });
    setSavedItemId(created.id);
  }

  async function handleConfirm(amount: number) {
    if (!scannedProduct) return;
    try {
      const item = savedItemId ? (items ?? []).find((i) => i.id === savedItemId) : null;
      if (item) {
        await logFoodItem.mutateAsync({ item, logDate: dateISO, grams: amount });
      } else {
        const scaled = scaleProductToGrams(
          {
            caloriesKcal: scannedProduct.caloriesKcal ?? 0,
            proteinG: scannedProduct.proteinG ?? 0,
            carbsG: scannedProduct.carbsG ?? 0,
            fatG: scannedProduct.fatG ?? 0,
            fiberG: scannedProduct.fiberG ?? 0,
          },
          amount,
        );
        await addFoodLog.mutateAsync({
          food_item_id: null,
          recipe_id: null,
          name: scannedProduct.brand ? `${scannedProduct.name} (${scannedProduct.brand})` : (scannedProduct.name ?? "Gescand product"),
          image_url: scannedProduct.imageUrl,
          ingredient_count: null,
          amount,
          unit: scannedProduct.unit,
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
      setStatus("log-error");
    }
  }

  function reset() {
    setScannedProduct(null);
    setSavedItemId(null);
    setStatus("idle");
    setScannerOpen(true);
  }

  const isFavorited = savedItemId ? Boolean((items ?? []).find((i) => i.id === savedItemId)?.is_favorite) : false;

  return (
    <div className="space-y-4">
      {!scannerOpen && !scannedProduct && (
        <button
          type="button"
          onClick={reset}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-opacity active:opacity-80"
        >
          <Barcode size={18} />
          Scan opnieuw
        </button>
      )}

      {status === "looking-up" && (
        <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Opzoeken bij Open Food Facts…
        </p>
      )}

      {status === "not-found" && (
        <div className="space-y-2 py-6 text-center">
          <p className="text-sm text-muted-foreground">Niet gevonden in Open Food Facts.</p>
          <button
            type="button"
            onClick={() =>
              router.push(`/log/new?date=${dateISO}${notFoundBarcode ? `&barcode=${encodeURIComponent(notFoundBarcode)}` : ""}`)
            }
            className="text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Nieuw product toevoegen
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-2 py-6 text-center">
          <p className="text-sm text-danger">Opzoeken is niet gelukt. Probeer het opnieuw of vul handmatig in.</p>
          <button type="button" onClick={reset} className="text-sm font-medium text-primary hover:underline">
            Opnieuw proberen
          </button>
        </div>
      )}

      {status === "log-error" && (
        <p className="py-2 text-center text-sm text-danger">
          Opslaan is niet gelukt. Probeer het opnieuw — als dit blijft gebeuren, is de database mogelijk nog niet
          bijgewerkt.
        </p>
      )}

      {scannerOpen && <BarcodeScanner onDetected={handleDetected} onClose={() => router.push("/")} />}

      {scannedProduct && (
        <ScannedProductReview
          product={scannedProduct}
          isFavorited={isFavorited}
          onToggleFavorite={handleToggleFavorite}
          onCancel={reset}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
