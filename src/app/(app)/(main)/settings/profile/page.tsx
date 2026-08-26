"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { TargetsForm } from "@/components/settings/TargetsForm";
import { Card } from "@/components/ui";
import { useUserId } from "@/lib/user-context";

export default function ProfileSettingsPage() {
  const userId = useUserId();

  return (
    <div className="space-y-4 px-4 pt-6">
      <header>
        <Link href="/settings" className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <ChevronLeft size={14} /> Instellingen
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Profielinstellingen</h1>
      </header>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Profiel</h2>
        <ProfileForm userId={userId} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Voedingsschema</h2>
        <TargetsForm userId={userId} />
      </Card>
    </div>
  );
}
