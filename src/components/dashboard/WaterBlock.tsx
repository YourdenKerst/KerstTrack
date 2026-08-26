"use client";

import { Minus, Plus, Wine } from "lucide-react";
import { useState } from "react";
import { Card, Toggle } from "@/components/ui";
import { useAlcoholLogForDate, useSetAlcoholLog } from "@/lib/queries/alcoholLogs";
import { useAddWaterLog, useDeleteWaterLog, useWaterLogsForDate } from "@/lib/queries/waterLogs";
import { ProgressRing } from "./ProgressRing";

const WATER_PRESETS = [
  { amountMl: 250, label: "250 ml" },
  { amountMl: 500, label: "500 ml" },
  { amountMl: 1000, label: "1 L" },
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
  const { data: alcoholLog } = useAlcoholLogForDate(userId, dateISO);
  const setAlcohol = useSetAlcoholLog(userId);
  const alcoholLogged = Boolean(alcoholLog);
  const [customAmount, setCustomAmount] = useState("");

  const lastWaterLog = waterLogs && waterLogs.length > 0 ? waterLogs[waterLogs.length - 1] : null;
  const pct = waterTarget > 0 ? Math.round((waterMl / waterTarget) * 100) : 0;

  function addCustom() {
    const amount = Number(customAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    addWater.mutate({ amountMl: Math.round(amount), logDate: dateISO });
    setCustomAmount("");
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <ProgressRing value={waterMl} max={waterTarget} size={52} strokeWidth={6} color="var(--macro-water)">
          <span className="text-[10px] font-semibold text-foreground">{pct}%</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Water</p>
          <p className="text-xs text-muted-foreground">
            {Math.round(waterMl)} / {Math.round(waterTarget)} ml
          </p>
        </div>
        {lastWaterLog && (
          <button
            type="button"
            onClick={() => deleteWater.mutate({ id: lastWaterLog.id, logDate: dateISO })}
            disabled={deleteWater.isPending}
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors active:text-danger disabled:opacity-50"
          >
            <Minus size={12} /> Ongedaan maken
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {WATER_PRESETS.map((preset) => (
          <button
            key={preset.amountMl}
            type="button"
            onClick={() => addWater.mutate({ amountMl: preset.amountMl, logDate: dateISO })}
            disabled={addWater.isPending}
            className="flex flex-col items-center gap-1 rounded-2xl bg-macro-water/15 py-3 text-sm font-semibold text-macro-water transition-colors active:bg-macro-water/25 disabled:opacity-50"
          >
            <Plus size={16} />
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Aangepaste hoeveelheid (ml)"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={addWater.isPending || !customAmount}
          className="shrink-0 rounded-xl bg-macro-water/15 px-4 text-sm font-semibold text-macro-water transition-colors active:bg-macro-water/25 disabled:opacity-50"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="flex items-center gap-2 text-sm text-foreground">
          <Wine size={16} className="text-muted-foreground" />
          Alcohol gedronken vandaag?
        </span>
        <Toggle
          checked={alcoholLogged}
          onChange={(value) => setAlcohol.mutate({ logDate: dateISO, value })}
          disabled={setAlcohol.isPending}
          aria-label="Alcohol gedronken vandaag"
        />
      </div>
    </Card>
  );
}
