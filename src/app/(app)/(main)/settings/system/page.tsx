"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ReminderSettingsCard } from "@/components/settings/ReminderSettingsCard";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { Card, Toggle } from "@/components/ui";
import {
  getServerWaterTrackingEnabled,
  getWaterTrackingEnabled,
  setWaterTrackingEnabled,
  subscribeToWaterTrackingChanges,
} from "@/lib/preferences";
import { useUserId } from "@/lib/user-context";

export default function SystemSettingsPage() {
  const userId = useUserId();
  const waterTrackingEnabled = useSyncExternalStore(
    subscribeToWaterTrackingChanges,
    getWaterTrackingEnabled,
    getServerWaterTrackingEnabled,
  );

  return (
    <div className="space-y-4 px-4 pt-6">
      <header>
        <Link href="/settings" className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <ChevronLeft size={14} /> Instellingen
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Systeeminstellingen</h1>
      </header>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Weergave</h2>
        <ThemeToggle />
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Water bijhouden</h2>
            <p className="text-xs text-muted-foreground">Verbergt het waterblok op het dashboard en in Trends.</p>
          </div>
          <Toggle
            checked={waterTrackingEnabled}
            onChange={setWaterTrackingEnabled}
            aria-label="Water bijhouden aan/uit"
          />
        </div>
      </Card>

      <ReminderSettingsCard userId={userId} />
    </div>
  );
}
