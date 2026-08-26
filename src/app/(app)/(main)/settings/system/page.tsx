"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ReminderSettingsCard } from "@/components/settings/ReminderSettingsCard";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { Card } from "@/components/ui";
import { useUserId } from "@/lib/user-context";

export default function SystemSettingsPage() {
  const userId = useUserId();

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

      <ReminderSettingsCard userId={userId} />
    </div>
  );
}
