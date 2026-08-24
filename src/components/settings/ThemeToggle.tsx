"use client";

import { clsx } from "clsx";
import { useSyncExternalStore } from "react";
import { getStoredTheme, setStoredTheme, subscribeToThemeChanges, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Systeem" },
  { value: "light", label: "Licht" },
  { value: "dark", label: "Donker" },
];

function getServerSnapshot(): ThemePreference {
  return "system";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToThemeChanges, getStoredTheme, getServerSnapshot);

  return (
    <div className="flex gap-1 rounded-xl bg-surface-muted p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setStoredTheme(opt.value)}
          className={clsx(
            "flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
            theme === opt.value ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
