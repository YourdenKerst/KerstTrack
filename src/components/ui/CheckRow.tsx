"use client";

import { clsx } from "clsx";
import { Check } from "lucide-react";

interface CheckRowProps {
  label: string;
  sublabel?: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  color?: string | null;
}

export function CheckRow({ label, sublabel, checked, onToggle, disabled, color }: CheckRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors active:bg-surface-muted disabled:opacity-50"
    >
      <span
        className={clsx(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
          checked ? "scale-105 border-primary bg-primary" : "border-border bg-transparent",
        )}
      >
        {checked && <Check size={14} strokeWidth={3} className="text-primary-foreground" />}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={clsx(
            "flex items-center gap-1.5 text-sm font-medium transition-colors",
            checked ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
          <span className="truncate">{label}</span>
        </span>
        {sublabel && <span className="block truncate text-xs text-muted-foreground">{sublabel}</span>}
      </span>
    </button>
  );
}
