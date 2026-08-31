"use client";

import { Check, Trash2, UtensilsCrossed, X } from "lucide-react";
import { useState } from "react";
import { relativeDayLabel } from "@/components/dashboard/DaySwitcher";
import { Button, Card, Input, Label } from "@/components/ui";
import { MEAL_BUCKET_LABELS, MEAL_BUCKET_ORDER, mealBucketForTime, type MealBucket } from "@/lib/calculations/mealBuckets";
import { todayISO } from "@/lib/date";
import { useDeleteFoodLog, useFoodLogsForDate, useUpdateFoodLogAmount } from "@/lib/queries/foodLogs";
import type { FoodLog } from "@/lib/types";

function FoodLogRow({ userId, log }: { userId: string; log: FoodLog }) {
  const deleteLog = useDeleteFoodLog(userId);
  const updateAmount = useUpdateFoodLogAmount(userId);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(log.amount ?? 0);
  const canEdit = log.amount != null && log.amount > 0;

  async function handleSave() {
    if (amount > 0) {
      await updateAmount.mutateAsync({ log, newAmount: amount });
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <Card className="space-y-2 p-3">
        <p className="truncate text-sm font-medium text-foreground">{log.name}</p>
        <div>
          <Label htmlFor={`amount-${log.id}`}>Hoeveelheid ({log.unit})</Label>
          <Input
            id={`amount-${log.id}`}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={handleSave} disabled={updateAmount.isPending || amount <= 0}>
            <Check size={14} /> Opslaan
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            <X size={14} /> Annuleren
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex items-center gap-3 p-3">
      <button
        type="button"
        onClick={() => canEdit && setEditing(true)}
        disabled={!canEdit}
        className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
      >
        {log.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- eigen/OFF-afbeelding, geen build-time optimalisatie nodig
          <img src={log.image_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground">
            <UtensilsCrossed size={18} />
          </div>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{log.name}</span>
          <span className="block text-xs text-muted-foreground">
            {Math.round(log.calories_kcal)} kcal
            {log.amount != null && ` · ${Math.round(log.amount)}${log.unit}`}
            {log.ingredient_count != null && ` · ${log.ingredient_count} producten`}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            E {Math.round(log.protein_g)}g · K {Math.round(log.carbs_g)}g · V {Math.round(log.fat_g)}g
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => deleteLog.mutate({ id: log.id, log_date: log.log_date })}
        aria-label={`Verwijder ${log.name}`}
        className="shrink-0 rounded-full p-2.5 text-muted-foreground transition-colors active:bg-surface-muted active:text-danger"
      >
        <Trash2 size={14} />
      </button>
    </Card>
  );
}

export function TodayFoodList({ userId, dateISO }: { userId: string; dateISO: string }) {
  const { data: logs } = useFoodLogsForDate(userId, dateISO);
  const label = relativeDayLabel(dateISO, todayISO());
  const isToday = label === "Vandaag";

  const byBucket = new Map<MealBucket, FoodLog[]>();
  for (const log of logs ?? []) {
    const bucket = mealBucketForTime(log.logged_at);
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), log]);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{isToday ? "Vandaag gegeten" : `Gegeten — ${label}`}</h2>
      {(!logs || logs.length === 0) && (
        <Card>
          <p className="text-sm text-muted-foreground">
            {isToday ? "Nog niets gelogd vandaag." : `Nog niets gelogd voor ${label.toLowerCase()}.`}
          </p>
        </Card>
      )}
      {MEAL_BUCKET_ORDER.filter((bucket) => byBucket.has(bucket)).map((bucket) => (
        <div key={bucket} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {MEAL_BUCKET_LABELS[bucket]}
          </h3>
          <ul className="space-y-2">
            {byBucket.get(bucket)!.map((log) => (
              <li key={log.id}>
                <FoodLogRow userId={userId} log={log} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
