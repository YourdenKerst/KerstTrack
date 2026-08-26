"use client";

import { Barcode, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BarcodeScanner } from "@/components/food/BarcodeScanner";
import { ScannedProductReview } from "@/components/food/ScannedProductReview";
import { todayISO } from "@/lib/date";
import { lookupBarcodeProduct, type OpenFoodFactsProduct } from "@/lib/openFoodFacts";
import { useAddFoodItem, findFoodItemByBarcode } from "@/lib/queries/foodItems";
import { useLogFoodItem } from "@/lib/queries/foodLogs";
import { useUserId } from "@/lib/user-context";

type ScanStatus = "idle" | "looking-up" | "not-found" | "error" | "logged";

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
  const logFoodItem = useLogFoodItem(userId);
  const addFoodItem = useAddFoodItem(userId);

  const [scannerOpen, setScannerOpen] = useState(true);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [scannedProduct, setScannedProduct] = useState<OpenFoodFactsProduct | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);

  async function handleDetected(barcode: string) {
    setScannerOpen(false);
    setStatus("looking-up");
    setScannedProduct(null);
    setNotFoundBarcode(null);

    try {
      const localMatch = await findFoodItemByBarcode(userId, barcode);
      if (localMatch) {
        await logFoodItem.mutateAsync({ item: localMatch, logDate: dateISO });
        setStatus("logged");
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

  async function handleConfirm(grams: number) {
    if (!scannedProduct) return;
    const item = await addFoodItem.mutateAsync({
      name: scannedProduct.name ?? "Gescand product",
      barcode: scannedProduct.barcode,
      image_url: scannedProduct.imageUrl,
      calories_kcal: scannedProduct.caloriesKcal ?? 0,
      protein_g: scannedProduct.proteinG ?? 0,
      carbs_g: scannedProduct.carbsG ?? 0,
      fat_g: scannedProduct.fatG ?? 0,
      fiber_g: scannedProduct.fiberG ?? 0,
      reference_grams: 100,
    });
    await logFoodItem.mutateAsync({ item, logDate: dateISO, grams });
    setScannedProduct(null);
    setStatus("logged");
  }

  function reset() {
    setScannedProduct(null);
    setStatus("idle");
    setScannerOpen(true);
  }

  return (
    <div className="space-y-4">
      {!scannerOpen && status !== "logged" && !scannedProduct && (
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

      {status === "logged" && (
        <div className="space-y-3 py-6 text-center">
          <p className="text-sm font-medium text-foreground">Gelogd!</p>
          <button type="button" onClick={reset} className="text-sm font-medium text-primary hover:underline">
            Nog een scannen
          </button>
        </div>
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
            Handmatig toevoegen
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

      {scannerOpen && <BarcodeScanner onDetected={handleDetected} onClose={() => router.push("/")} />}

      {scannedProduct && (
        <ScannedProductReview product={scannedProduct} onCancel={reset} onConfirm={handleConfirm} />
      )}
    </div>
  );
}
