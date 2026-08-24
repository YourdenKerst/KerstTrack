"use client";

import { Barcode, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { BarcodeScanner } from "@/components/food/BarcodeScanner";
import { DayTotalsCard } from "@/components/food/DayTotalsCard";
import { FavoritesList } from "@/components/food/FavoritesList";
import { EMPTY_FOOD_LOG_VALUES, FoodLogForm, type FoodLogFormValues } from "@/components/food/FoodLogForm";
import { ScannedProductReview } from "@/components/food/ScannedProductReview";
import { TodayFoodList } from "@/components/food/TodayFoodList";
import { Card } from "@/components/ui";
import { relativeDayLabel } from "@/components/dashboard/DaySwitcher";
import { MicronutrientBars } from "@/components/dashboard/MicronutrientBars";
import { sumMacros } from "@/lib/calculations/nutrition";
import { applyLinkedSupplements, sumMicronutrients } from "@/lib/calculations/micronutrients";
import { addDaysISO, MAX_FUTURE_PLANNING_DAYS, todayISO } from "@/lib/date";
import { lookupBarcodeProduct, type OpenFoodFactsProduct } from "@/lib/openFoodFacts";
import { useDailyTargets } from "@/lib/queries/dailyTargets";
import { findFoodItemByBarcode } from "@/lib/queries/foodItems";
import { useFoodLogsForDate, useLogFoodItem } from "@/lib/queries/foodLogs";
import { useSupplementLogsForDate } from "@/lib/queries/supplementLogs";
import { useSupplements } from "@/lib/queries/supplements";
import { useUserId } from "@/lib/user-context";

type ScanStatus = "idle" | "looking-up" | "not-found" | "error";

export default function FoodPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground">Laden…</div>}>
      <FoodPageContent />
    </Suspense>
  );
}

function FoodPageContent() {
  const userId = useUserId();
  const today = todayISO();
  const router = useRouter();
  const searchParams = useSearchParams();
  const maxDate = addDaysISO(today, MAX_FUTURE_PLANNING_DAYS);
  const requestedDate = searchParams.get("date");
  const selectedDate = requestedDate && requestedDate <= maxDate ? requestedDate : today;
  const dayLabel = relativeDayLabel(selectedDate, today);

  const { data: targets } = useDailyTargets(userId);
  const { data: logs } = useFoodLogsForDate(userId, selectedDate);
  const { data: supplements } = useSupplements(userId);
  const { data: supplementLogs } = useSupplementLogsForDate(userId, selectedDate);
  const logFoodItem = useLogFoodItem(userId);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scannedProduct, setScannedProduct] = useState<OpenFoodFactsProduct | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<{ values: FoodLogFormValues; barcode: string | null } | null>(null);
  const [formKey, setFormKey] = useState(0);
  const logFormRef = useRef<HTMLDivElement>(null);

  async function handleDetected(barcode: string) {
    setScannerOpen(false);
    setScanStatus("looking-up");
    setScannedProduct(null);
    setNotFoundBarcode(null);

    try {
      const localMatch = await findFoodItemByBarcode(userId, barcode);
      if (localMatch) {
        await logFoodItem.mutateAsync({ item: localMatch, logDate: selectedDate });
        setScanStatus("idle");
        return;
      }

      const product = await lookupBarcodeProduct(barcode);
      if (!product) {
        setNotFoundBarcode(barcode);
        setScanStatus("not-found");
        return;
      }
      setScannedProduct(product);
      setScanStatus("idle");
    } catch {
      setScanStatus("error");
    }
  }

  function handleManualAddFromScan() {
    setPrefill({ values: EMPTY_FOOD_LOG_VALUES, barcode: notFoundBarcode });
    setScanStatus("idle");
    setFormKey((k) => k + 1);
    logFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!targets) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Laden…</div>;
  }

  const totals = sumMacros(logs ?? []);
  const checkedSupplementIds = new Set((supplementLogs ?? []).map((log) => log.supplement_id));
  const micronutrientTotals = applyLinkedSupplements(
    sumMicronutrients(logs ?? []),
    supplements ?? [],
    checkedSupplementIds,
  );

  return (
    <div className="space-y-4 px-4 pt-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Voeding</h1>
        {dayLabel !== "Vandaag" && (
          <p className="mt-1 text-xs text-muted-foreground">
            Je plant nu voor <span className="font-medium text-foreground">{dayLabel.toLowerCase()}</span> —{" "}
            <button type="button" onClick={() => router.push("/food")} className="font-medium text-primary hover:underline">
              terug naar vandaag
            </button>
          </p>
        )}
      </header>

      <DayTotalsCard totals={totals} targets={targets} dateISO={selectedDate} />

      <Card>
        <MicronutrientBars totals={micronutrientTotals} targets={targets} totalLoggedItems={(logs ?? []).length} />
      </Card>

      <button
        type="button"
        onClick={() => setScannerOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Barcode size={18} />
        Scan streepjescode
      </button>

      {scanStatus === "looking-up" && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Opzoeken bij Open Food Facts…
        </p>
      )}
      {scanStatus === "not-found" && (
        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">Niet gevonden in Open Food Facts.</p>
          <button
            type="button"
            onClick={handleManualAddFromScan}
            className="text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Handmatig toevoegen
          </button>
        </div>
      )}
      {scanStatus === "error" && (
        <p className="text-center text-sm text-danger">Opzoeken is niet gelukt. Probeer het opnieuw of vul handmatig in.</p>
      )}

      {scannerOpen && <BarcodeScanner onDetected={handleDetected} onClose={() => setScannerOpen(false)} />}

      {scannedProduct && (
        <ScannedProductReview
          product={scannedProduct}
          onCancel={() => setScannedProduct(null)}
          onConfirm={(values) => {
            setPrefill({ values, barcode: scannedProduct.barcode });
            setScannedProduct(null);
            setFormKey((k) => k + 1);
          }}
        />
      )}

      <FavoritesList userId={userId} dateISO={selectedDate} />

      <Card ref={logFormRef}>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Nieuw item loggen</h2>
        <FoodLogForm
          key={formKey}
          userId={userId}
          dateISO={selectedDate}
          initialValues={prefill?.values}
          barcode={prefill?.barcode}
          disclaimer={prefill ? "Gescande waarden — controleer voor je opslaat." : undefined}
        />
      </Card>

      <TodayFoodList userId={userId} dateISO={selectedDate} />
    </div>
  );
}
