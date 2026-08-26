"use client";

import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui";
import { CorrectionBanner } from "@/components/dashboard/CorrectionBanner";
import { DaySwitcher } from "@/components/dashboard/DaySwitcher";
import { MacroRings } from "@/components/dashboard/MacroRings";
import { SupplementChecklist } from "@/components/dashboard/SupplementChecklist";
import { WaterBlock } from "@/components/dashboard/WaterBlock";
import { WeightHeaderBadge } from "@/components/dashboard/WeightHeaderBadge";
import { TodayFoodList } from "@/components/food/TodayFoodList";
import { sumMacros } from "@/lib/calculations/nutrition";
import type { GoalPlan } from "@/lib/calculations/recommendedTargets";
import { addDaysISO, formatFullDate, MAX_FUTURE_PLANNING_DAYS, todayISO } from "@/lib/date";
import { useEffectiveWaterTarget } from "@/lib/hooks/useEffectiveWaterTarget";
import { useFoodLogsForDate } from "@/lib/queries/foodLogs";
import { useProfile } from "@/lib/queries/profiles";
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

  if (!targets) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Laden…</div>;
  }

  const totals = sumMacros(foodLogs ?? []);
  const waterMl = (waterLogs ?? []).reduce((sum, log) => sum + log.amount_ml, 0);

  return (
    <div className="space-y-4 px-4 pt-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="truncate text-xl font-semibold text-foreground">
            Welkom{profile?.display_name ? `, ${profile.display_name}` : ""}
          </h1>
          <WeightHeaderBadge userId={userId} goal={(profile?.goal as GoalPlan | null) ?? null} />
        </div>
        <Card className="py-2">
          <DaySwitcher selectedDate={selectedDate} onChange={setSelectedDate} />
        </Card>
        <p className="text-center text-xs capitalize text-muted-foreground">{formatFullDate(selectedDate)}</p>
      </header>

      {correctionActive && <CorrectionBanner userId={userId} dateISO={selectedDate} />}

      <MacroRings totals={totals} targets={targets} />

      <Link
        href={selectedDate === today ? "/log" : `/log?date=${selectedDate}`}
        className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-opacity active:opacity-80"
      >
        <UtensilsCrossed size={18} /> Maaltijd loggen
      </Link>

      <WaterBlock userId={userId} dateISO={selectedDate} waterMl={waterMl} waterTarget={waterTarget} />

      <TodayFoodList userId={userId} dateISO={selectedDate} />

      <SupplementChecklist userId={userId} dateISO={selectedDate} />
    </div>
  );
}
