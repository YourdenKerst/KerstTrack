"use client";

import { ChevronRight, LogOut, Settings2, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
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

      <Card className="p-0">
        <Link href="/settings/system" className="flex items-center justify-between gap-2 p-4">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Settings2 size={16} className="text-muted-foreground" />
            Systeeminstellingen
          </span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>
      </Card>

      <Card className="p-0">
        <Link href="/settings/profile" className="flex items-center justify-between gap-2 p-4">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <User size={16} className="text-muted-foreground" />
            Profielinstellingen
          </span>
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
