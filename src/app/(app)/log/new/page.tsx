"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FoodLogForm, type FoodLogFormValues } from "@/components/food/FoodLogForm";
import { todayISO } from "@/lib/date";
import { useUserId } from "@/lib/user-context";

function parsePrefill(raw: string | null): { values: FoodLogFormValues; barcode: string | null } | null {
  if (!raw) return null;
  try {
    const { barcode, ...values } = JSON.parse(raw) as FoodLogFormValues & { barcode?: string | null };
    return { values, barcode: barcode ?? null };
  } catch {
    return null;
  }
}

export default function NewFoodPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground">Laden…</div>}>
      <NewFoodPageContent />
    </Suspense>
  );
}

function NewFoodPageContent() {
  const userId = useUserId();
  const searchParams = useSearchParams();
  const dateISO = searchParams.get("date") ?? todayISO();
  const barcodeParam = searchParams.get("barcode");
  const prefill = parsePrefill(searchParams.get("prefill"));
  const barcode = prefill?.barcode ?? barcodeParam;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {prefill
          ? "Gescande waarden — controleer voor je opslaat."
          : "Voeg een nieuw product toe dat nog niet in de database staat."}
      </p>
      <FoodLogForm
        key={searchParams.get("prefill") ?? searchParams.get("barcode") ?? "empty"}
        userId={userId}
        dateISO={dateISO}
        barcode={barcode}
        initialValues={prefill?.values}
        disclaimer={barcodeParam && !prefill ? "Niet gevonden via de streepjescode — vul de waarden handmatig in." : undefined}
      />
    </div>
  );
}
