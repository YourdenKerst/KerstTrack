"use client";

import { Minus, Plus, UtensilsCrossed, Wine } from "lucide-react";
import Link from "next/link";
import { Card, Toggle } from "@/components/ui";
import { todayISO } from "@/lib/date";
import { useAlcoholLogForDate, useSetAlcoholLog } from "@/lib/queries/alcoholLogs";
import { useAddWaterLog, useDeleteWaterLog, useWaterLogsForDate } from "@/lib/queries/waterLogs";

const WATER_PRESETS = [
  { amountMl: 250, label: "250 ml" },
  { amountMl: 500, label: "500 ml" },
  { amountMl: 1000, label: "1 L" },
];

export function QuickActions({ userId, dateISO }: { userId: string; dateISO: string }) {
  const addWater = useAddWaterLog(userId);
  const deleteWater = useDeleteWaterLog(userId);
  const { data: waterLogs } = useWaterLogsForDate(userId, dateISO);
  const { data: alcoholLog } = useAlcoholLogForDate(userId, dateISO);
  const setAlcohol = useSetAlcoholLog(userId);
  const alcoholLogged = Boolean(alcoholLog);

  const lastWaterLog = waterLogs && waterLogs.length > 0 ? waterLogs[waterLogs.length - 1] : null;

  return (
    <Card className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Water toevoegen</span>
          {lastWaterLog && (
            <button
              type="button"
              onClick={() => deleteWater.mutate({ id: lastWaterLog.id, logDate: dateISO })}
              disabled={deleteWater.isPending}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-danger disabled:opacity-50"
            >
              <Minus size={12} /> Ongedaan maken ({lastWaterLog.amount_ml} ml)
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
              className="flex flex-col items-center gap-1 rounded-2xl bg-macro-water/15 py-3.5 text-sm font-semibold text-macro-water transition-colors hover:bg-macro-water/25 disabled:opacity-50"
            >
              <Plus size={18} />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <Link
        href={dateISO === todayISO() ? "/food" : `/food?date=${dateISO}`}
        className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <UtensilsCrossed size={18} /> Maaltijd loggen
      </Link>

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
