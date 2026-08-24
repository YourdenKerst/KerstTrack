import { MICRONUTRIENT_META } from "@/lib/constants";
import type { MicronutrientTotals } from "@/lib/calculations/micronutrients";
import type { DailyTargets, MicronutrientKey } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";

export function MicronutrientBars({
  totals,
  targets,
  totalLoggedItems,
}: {
  totals: MicronutrientTotals;
  targets: DailyTargets;
  totalLoggedItems: number;
}) {
  const anyData = Object.values(totals).some((t) => t.loggedCount > 0);

  if (!anyData) {
    return (
      <div>
        <h2 className="mb-1 text-sm font-semibold text-foreground">Overige voedingsstoffen</h2>
        <p className="text-sm text-muted-foreground">
          Nog geen data — scan een streepjescode of vul dit handmatig aan bij het loggen van voeding.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-foreground">Overige voedingsstoffen</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {MICRONUTRIENT_META.map((meta) => {
          const total = totals[meta.key as MicronutrientKey];
          const target = targets[meta.key as MicronutrientKey];
          return (
            <div key={meta.key}>
              <div className="mb-1 flex items-baseline justify-between text-[11px]">
                <span className="font-medium text-foreground">{meta.label}</span>
                <span className="text-muted-foreground">
                  {Math.round(total.total * 10) / 10}/{Math.round(target)} {meta.unit}
                </span>
              </div>
              <ProgressBar value={total.total} max={target} color={meta.colorVar} />
              {total.loggedCount > 0 && total.loggedCount < totalLoggedItems && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Op basis van {total.loggedCount}/{totalLoggedItems} items
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Deels op basis van schattingen (Open Food Facts) — niet altijd exact zoals op het etiket.
      </p>
    </div>
  );
}
