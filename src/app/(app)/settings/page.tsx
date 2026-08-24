"use client";

import { ChevronRight, LogOut, Pill } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { ReminderSettingsCard } from "@/components/settings/ReminderSettingsCard";
import { TargetsForm } from "@/components/settings/TargetsForm";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useUserId } from "@/lib/user-context";

export default function SettingsPage() {
  const userId = useUserId();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="space-y-4 px-4 pt-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Instellingen</h1>
      </header>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Weergave</h2>
        <ThemeToggle />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Dagdoelen</h2>
        <TargetsForm userId={userId} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Profiel</h2>
        <ProfileForm userId={userId} />
      </Card>

      <ReminderSettingsCard />

      <Card className="p-0">
        <Link href="/supplements" className="flex items-center justify-between gap-2 p-4">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Pill size={16} className="text-muted-foreground" />
            Supplementenschema beheren
          </span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>
      </Card>

      <Card className="p-0">
        <Link href="/settings/nutrients" className="flex items-center justify-between gap-2 p-4">
          <span className="text-sm font-medium text-foreground">Micronutriënten-referentie</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>
      </Card>

      <Button variant="secondary" fullWidth onClick={handleSignOut} disabled={signingOut}>
        <LogOut size={16} />
        {signingOut ? "Uitloggen…" : "Uitloggen"}
      </Button>
    </div>
  );
}
