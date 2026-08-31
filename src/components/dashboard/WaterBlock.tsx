"use client";

import { Plus, Undo2 } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui";
import { useAddWaterLog, useDeleteWaterLog, useWaterLogsForDate } from "@/lib/queries/waterLogs";
import { ProgressRing } from "./ProgressRing";

const WATER_PRESETS = [
  { amountMl: 250, label: "250" },
  { amountMl: 500, label: "500" },
  { amountMl: 1000, label: "1L" },
];

export function WaterBlock({
  userId,
  dateISO,
  waterMl,
  waterTarget,
}: {
  userId: string;
  dateISO: string;
  waterMl: number;
  waterTarget: number;
}) {
  const addWater = useAddWaterLog(userId);
  const deleteWater = useDeleteWaterLog(userId);
  const { data: waterLogs } = useWaterLogsForDate(userId, dateISO);
  const [customOpen, setCustomOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  const lastWaterLog = waterLogs && waterLogs.length > 0 ? waterLogs[waterLogs.length - 1] : null;
  const pct = waterTarget > 0 ? Math.round((waterMl / waterTarget) * 100) : 0;

  function addCustom() {
    const amount = Number(customAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    addWater.mutate({ amountMl: Math.round(amount), logDate: dateISO });
    setCustomAmount("");
    setCustomOpen(false);
  }

  return (
    <Card className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <ProgressRing value={waterMl} max={waterTarget} size={40} strokeWidth={5} color="var(--macro-water)">
          <span className="text-[9px] font-semibold text-foreground">{pct}%</span>
        </ProgressRing>
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {Math.round(waterMl)}/{Math.round(waterTarget)} ml
        </p>
        {lastWaterLog && (
          <button
            type="button"
            onClick={() => deleteWater.mutate({ id: lastWaterLog.id, logDate: dateISO })}
            disabled={deleteWater.isPending}
            aria-label="Laatste toevoeging ongedaan maken"
            className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors active:bg-surface-muted active:text-danger disabled:opacity-50"
          >
            <Undo2 size={14} />
          </button>
        )}
        {WATER_PRESETS.map((preset) => (
          <button
            key={preset.amountMl}
            type="button"
            onClick={() => addWater.mutate({ amountMl: preset.amountMl, logDate: dateISO })}
            disabled={addWater.isPending}
            className="shrink-0 rounded-full bg-macro-water/15 px-2.5 py-1 text-xs font-semibold text-macro-water transition-colors active:bg-macro-water/25 disabled:opacity-50"
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          aria-label="Aangepaste hoeveelheid toevoegen"
          className="shrink-0 rounded-full bg-surface-muted p-1.5 text-muted-foreground transition-colors active:bg-border"
        >
          <Plus size={14} />
        </button>
      </div>

      {customOpen && (
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Hoeveelheid (ml)"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            autoFocus
            className="w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={addWater.isPending || !customAmount}
            className="shrink-0 rounded-xl bg-macro-water/15 px-4 text-sm font-semibold text-macro-water transition-colors active:bg-macro-water/25 disabled:opacity-50"
          >
            Toevoegen
          </button>
        </div>
      )}
    </Card>
  );
}
