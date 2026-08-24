"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { useAddWaterLog } from "@/lib/queries/waterLogs";

const PRESETS = [
  { amountMl: 250, label: "250 ml" },
  { amountMl: 500, label: "500 ml" },
  { amountMl: 1000, label: "1 L" },
];

export function QuickAddWater({ userId, dateISO }: { userId: string; dateISO: string }) {
  const addWater = useAddWaterLog(userId);
  const [customAmount, setCustomAmount] = useState("");

  function addCustom() {
    const amount = Number(customAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    addWater.mutate({ amountMl: Math.round(amount), logDate: dateISO });
    setCustomAmount("");
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((preset) => (
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
      <div className="flex gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Zelf invoeren (ml)"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
        />
        <Button variant="secondary" onClick={addCustom} disabled={addWater.isPending}>
          <Plus size={16} />
        </Button>
      </div>
    </div>
  );
}
