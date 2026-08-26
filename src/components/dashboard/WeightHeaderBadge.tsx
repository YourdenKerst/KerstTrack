"use client";

import { clsx } from "clsx";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { GoalPlan } from "@/lib/calculations/recommendedTargets";
import { todayISO } from "@/lib/date";
import { useRecentWeightLogs, useUpsertWeightLog } from "@/lib/queries/weightLogs";

type Tone = "good" | "bad" | "neutral";

function deltaTone(delta: number, goal: GoalPlan | null): Tone {
  if (delta === 0) return "neutral";
  if (goal === "afvallen") return delta < 0 ? "good" : "bad";
  if (goal === "spieropbouw") return delta > 0 ? "good" : "bad";
  if (goal === "onderhoud") return "bad";
  return "neutral";
}

export function WeightHeaderBadge({ userId, goal }: { userId: string; goal: GoalPlan | null }) {
  const { data: logs } = useRecentWeightLogs(userId, 2);
  const upsertWeight = useUpsertWeightLog(userId);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const latest = logs?.[0];
  const previous = logs?.[1];
  const delta = latest && previous ? Math.round((latest.weight_kg - previous.weight_kg) * 10) / 10 : null;
  const tone: Tone = delta === null ? "neutral" : deltaTone(delta, goal);

  async function handleSave() {
    const weightKg = Number(value);
    if (!Number.isFinite(weightKg) || weightKg <= 0) return;
    await upsertWeight.mutateAsync({ weightKg, logDate: todayISO() });
    setValue("");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          autoFocus
          placeholder="kg"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={upsertWeight.isPending || !value}
          className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          Log
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs font-medium text-muted-foreground"
        >
          Annuleren
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label="Gewicht van vandaag loggen"
      className={clsx(
        "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium transition-opacity active:opacity-70",
        tone === "good" && "bg-success/10 text-success",
        tone === "bad" && "bg-danger/10 text-danger",
        tone === "neutral" && "bg-surface-muted text-muted-foreground",
      )}
    >
      {delta === null ? (
        "Log gewicht"
      ) : (
        <>
          {delta < 0 && <TrendingDown size={14} />}
          {delta > 0 && <TrendingUp size={14} />}
          {delta === 0 && <Minus size={14} />}
          {delta > 0 ? "+" : ""}
          {delta.toFixed(1)} kg
        </>
      )}
    </button>
  );
}
