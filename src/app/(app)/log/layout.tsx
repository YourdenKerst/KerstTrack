"use client";

import { clsx } from "clsx";
import { Barcode, ChefHat, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

const MODES = [
  { href: "/log/new", label: "Nieuw", icon: Plus },
  { href: "/log/meal", label: "Maaltijd", icon: ChefHat },
  { href: "/log/search", label: "Zoek", icon: Search },
  { href: "/log/scan", label: "Scan", icon: Barcode },
] as const;

export default function LogLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const withDate = (href: string) => (dateParam ? `${href}?date=${dateParam}` : href);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border p-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <h1 className="text-sm font-semibold text-foreground">Maaltijd toevoegen</h1>
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Sluiten"
          className="rounded-full p-2.5 text-muted-foreground transition-colors active:bg-surface-muted active:text-foreground"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-surface/95 backdrop-blur-sm">
        <ul className="mx-auto flex max-w-md items-stretch justify-between px-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
          {MODES.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={withDate(href)}
                  className={clsx(
                    "flex flex-col items-center gap-0.5 py-3 text-[11px] font-medium transition-colors active:opacity-60",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
