"use client";

import { SupplementChecklist } from "@/components/dashboard/SupplementChecklist";
import { StreakList } from "@/components/supplements/StreakList";
import { SupplementManager } from "@/components/supplements/SupplementManager";
import { todayISO } from "@/lib/date";
import { useUserId } from "@/lib/user-context";

export default function SupplementsPage() {
  const userId = useUserId();
  const today = todayISO();

  return (
    <div className="space-y-4 px-4 pt-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Supplementen</h1>
      </header>

      <SupplementChecklist userId={userId} dateISO={today} />
      <StreakList userId={userId} />
      <SupplementManager userId={userId} />
    </div>
  );
}
