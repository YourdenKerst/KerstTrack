import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import type { MacroTotals } from "@/lib/calculations/nutrition";
import type { DailyTargets } from "@/lib/types";
import { ProgressRing } from "./ProgressRing";

function pct(value: number, target: number): number {
  return target > 0 ? Math.round((value / target) * 100) : 0;
}

function MacroMini({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <ProgressRing value={value} max={target} size={60} strokeWidth={7} color={color}>
        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold text-foreground">{Math.round(value)}</span>
          <span className="text-[9px] text-muted-foreground">{pct(value, target)}%</span>
        </div>
      </ProgressRing>
      <span className="text-[11px] text-muted-foreground">
        {label} <span className="text-muted-foreground/70">/{Math.round(target)}g</span>
      </span>
    </div>
  );
}

export function MacroRings({
  totals,
  targets,
  children,
}: {
  totals: MacroTotals;
  targets: DailyTargets;
  children?: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <ProgressRing
          value={totals.calories_kcal}
          max={targets.calories_kcal}
          size={108}
          strokeWidth={11}
          color="var(--macro-calories)"
        >
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">{Math.round(totals.calories_kcal)}</div>
            <div className="text-[10px] text-muted-foreground">/ {targets.calories_kcal} kcal</div>
            <div className="text-[10px] font-medium" style={{ color: "var(--macro-calories)" }}>
              {pct(totals.calories_kcal, targets.calories_kcal)}%
            </div>
          </div>
        </ProgressRing>
        <div className="grid flex-1 grid-cols-3 gap-1">
          <MacroMini label="Eiwit" value={totals.protein_g} target={targets.protein_g} color="var(--macro-protein)" />
          <MacroMini label="Koolh." value={totals.carbs_g} target={targets.carbs_g} color="var(--macro-carbs)" />
          <MacroMini label="Vet" value={totals.fat_g} target={targets.fat_g} color="var(--macro-fat)" />
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </Card>
  );
}
