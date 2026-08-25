import type { ReactNode } from "react";
import { BottomNav } from "@/components/nav/BottomNav";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="mx-auto min-h-screen w-full max-w-md pb-24 pt-[env(safe-area-inset-top)]">{children}</div>
      <BottomNav />
    </>
  );
}
