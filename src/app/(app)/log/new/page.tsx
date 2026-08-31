"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { NewFoodItemForm } from "@/components/food/NewFoodItemForm";
import { todayISO } from "@/lib/date";
import { useUserId } from "@/lib/user-context";

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
  const barcode = searchParams.get("barcode");
  const dateISO = searchParams.get("date") ?? todayISO();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Voeg een nieuw product toe aan de database.</p>
      <NewFoodItemForm
        userId={userId}
        barcode={barcode}
        dateISO={dateISO}
        disclaimer={barcode ? "Niet gevonden via de streepjescode — vul de waarden handmatig in." : undefined}
      />
    </div>
  );
}
