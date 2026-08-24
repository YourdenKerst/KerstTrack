import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/nav/BottomNav";
import { SupplementReminders } from "@/components/pwa/SupplementReminders";
import { UserProvider } from "@/lib/user-context";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <UserProvider userId={user.id}>
      <SupplementReminders />
      <div className="mx-auto min-h-screen w-full max-w-md pb-24 pt-[env(safe-area-inset-top)]">{children}</div>
      <BottomNav />
    </UserProvider>
  );
}
