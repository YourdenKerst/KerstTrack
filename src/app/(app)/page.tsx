"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui";
import { CorrectionBanner } from "@/components/dashboard/CorrectionBanner";
import { DaySwitcher } from "@/components/dashboard/DaySwitcher";
import { MacroRings } from "@/components/dashboard/MacroRings";
import { MicronutrientBars } from "@/components/dashboard/MicronutrientBars";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { SupplementChecklist } from "@/components/dashboard/SupplementChecklist";
import { WeightTrendCard } from "@/components/dashboard/WeightTrendCard";
import { sumMacros } from "@/lib/calculations/nutrition";
import { applyLinkedSupplements, sumMicronutrients } from "@/lib/calculations/micronutrients";
import { addDaysISO, formatFullDate, MAX_FUTURE_PLANNING_DAYS, todayISO } from "@/lib/date";
import { useEffectiveWaterTarget } from "@/lib/hooks/useEffectiveWaterTarget";
import { useFoodLogsForDate } from "@/lib/queries/foodLogs";
import { useProfile } from "@/lib/queries/profiles";
import { useSupplementLogsForDate } from "@/lib/queries/supplementLogs";
import { useSupplements } from "@/lib/queries/supplements";
import { useWaterLogsForDate } from "@/lib/queries/waterLogs";
import { useUserId } from "@/lib/user-context";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground">Laden…</div>}>
      <DashboardPageContent />
    </Suspense>
  );
}

function DashboardPageContent() {
  const userId = useUserId();
  const today = todayISO();
  const router = useRouter();
  const searchParams = useSearchParams();

  const maxDate = addDaysISO(today, MAX_FUTURE_PLANNING_DAYS);
  const requestedDate = searchParams.get("date");
  const selectedDate = requestedDate && requestedDate <= maxDate ? requestedDate : today;

  function setSelectedDate(dateISO: string) {
    const clamped = dateISO > maxDate ? maxDate : dateISO;
    const params = new URLSearchParams(searchParams);
    if (clamped === today) {
      params.delete("date");
    } else {
      params.set("date", clamped);
    }
    router.push(params.size > 0 ? `/?${params.toString()}` : "/", { scroll: false });
  }

  const { data: profile } = useProfile(userId);
  const { targets, correctionActive, waterTarget } = useEffectiveWaterTarget(userId, selectedDate);
  const { data: foodLogs } = useFoodLogsForDate(userId, selectedDate);
  const { data: waterLogs } = useWaterLogsForDate(userId, selectedDate);
  const { data: supplements } = useSupplements(userId);
  const { data: supplementLogs } = useSupplementLogsForDate(userId, selectedDate);

  if (!targets) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Laden…</div>;
  }

  const totals = sumMacros(foodLogs ?? []);
  const checkedSupplementIds = new Set((supplementLogs ?? []).map((log) => log.supplement_id));
  const micronutrientTotals = applyLinkedSupplements(
    sumMicronutrients(foodLogs ?? []),
    supplements ?? [],
    checkedSupplementIds,
  );
  const waterMl = (waterLogs ?? []).reduce((sum, log) => sum + log.amount_ml, 0);

  return (
    <div className="space-y-4 px-4 pt-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">
          Welkom{profile?.display_name ? `, ${profile.display_name}` : ""}
        </h1>
        <Card className="py-2">
          <DaySwitcher selectedDate={selectedDate} onChange={setSelectedDate} />
        </Card>
        <p className="text-center text-xs capitalize text-muted-foreground">{formatFullDate(selectedDate)}</p>
      </header>

      {correctionActive && <CorrectionBanner userId={userId} dateISO={selectedDate} />}

      <MacroRings totals={totals} targets={targets} waterMl={waterMl} waterTarget={waterTarget} />

      <Card>
        <MicronutrientBars
          totals={micronutrientTotals}
          targets={targets}
          totalLoggedItems={(foodLogs ?? []).length}
        />
      </Card>

      <QuickActions userId={userId} dateISO={selectedDate} />

      <SupplementChecklist userId={userId} dateISO={selectedDate} />

      <WeightTrendCard userId={userId} />
    </div>
  );
}
