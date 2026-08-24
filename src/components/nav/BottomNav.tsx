"use client";

import { clsx } from "clsx";
import { Home, Pill, Settings, TrendingUp, Utensils } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Vandaag", icon: Home, colorVar: "var(--primary)" },
  { href: "/food", label: "Voeding", icon: Utensils, colorVar: "var(--macro-calories)" },
  { href: "/supplements", label: "Supplementen", icon: Pill, colorVar: "var(--macro-fat)" },
  { href: "/trends", label: "Trends", icon: TrendingUp, colorVar: "var(--macro-water)" },
  { href: "/settings", label: "Instellingen", icon: Settings, colorVar: "var(--muted-foreground)" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-sm">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        {items.map(({ href, label, icon: Icon, colorVar }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                style={active ? { color: colorVar } : undefined}
                className={clsx(
                  "flex flex-col items-center gap-0.5 py-3 text-[11px] font-medium transition-colors active:opacity-60",
                  !active && "text-muted-foreground",
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
  );
}
