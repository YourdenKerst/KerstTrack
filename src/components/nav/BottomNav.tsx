"use client";

import { clsx } from "clsx";
import { Home, Pill, Plus, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Vandaag", icon: Home, colorVar: "var(--primary)" },
  { href: "/supplements", label: "Supplementen", icon: Pill, colorVar: "var(--macro-fat)" },
  { href: "/trends", label: "Trends", icon: TrendingUp, colorVar: "var(--macro-water)" },
  { href: "/settings", label: "Instellingen", icon: Settings, colorVar: "var(--muted-foreground)" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-sm">
      <ul className="relative mx-auto flex max-w-md items-stretch justify-between px-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        {items.slice(0, 2).map((item) => (
          <NavItem key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}

        <li className="flex-1">
          <Link
            href="/log"
            aria-label="Maaltijd toevoegen"
            className="flex flex-col items-center justify-end gap-0.5 py-3 text-[11px] font-medium text-muted-foreground"
          >
            <span className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95">
              <Plus size={26} strokeWidth={2.4} />
            </span>
          </Link>
        </li>

        {items.slice(2).map((item) => (
          <NavItem key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}
      </ul>
    </nav>
  );
}

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavItem({
  href,
  label,
  icon: Icon,
  colorVar,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  colorVar: string;
  active: boolean;
}) {
  return (
    <li className="flex-1">
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
}
