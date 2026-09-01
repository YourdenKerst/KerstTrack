"use client";

import { Trash2, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { relativeDayLabel } from "@/components/dashboard/DaySwitcher";
import { ProductAmountPicker, type ProductAmountResult } from "@/components/food/ProductAmountPicker";
import { Card } from "@/components/ui";
import { MEAL_CATEGORY_LABELS, MEAL_CATEGORY_ORDER } from "@/lib/calculations/mealBuckets";
import { todayISO } from "@/lib/date";
import type { OpenFoodFactsProduct } from "@/lib/openFoodFacts";
import { useDeleteFoodLog, useFoodLogsForDate, useUpdateFoodLog } from "@/lib/queries/foodLogs";
import type { FoodLog, MealCategory } from "@/lib/types";

/** Reconstrueert de "per 100"-vorm uit een reeds geschaalde log, voor de maten-kiezer bij bewerken. */
function logToProduct(log: FoodLog): OpenFoodFactsProduct {
  const factor = log.amount && log.amount > 0 ? 100 / log.amount : 0;
  return {
    barcode: "",
    name: log.name,
    brand: null,
    imageUrl: log.image_url,
    caloriesKcal: log.calories_kcal * factor,
    proteinG: log.protein_g * factor,
    carbsG: log.carbs_g * factor,
    fatG: log.fat_g * factor,
    fiberG: log.fiber_g * factor,
    unit: log.serving_unit ?? log.unit,
    servingSize: log.serving_size,
  };
}

/** Alleen te reconstrueren als "Portie" toen die maat ook echt gekozen is (zie serving_size-notitie in schema.sql). */
function initialSelectionForLog(log: FoodLog): { key: string; count: number } {
  if (log.serving_size && log.amount) {
    return { key: "portion", count: Math.round((log.amount / log.serving_size) * 100) / 100 };
  }
  return { key: log.unit === "ml" ? "ml" : "gram", count: log.amount ?? 0 };
}

function FoodLogRow({ log, onEdit, onDelete }: { log: FoodLog; onEdit: () => void; onDelete: () => void }) {
  const canEdit = log.amount != null && log.amount > 0;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {canEdit ? (
        <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <FoodLogRowContent log={log} />
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <FoodLogRowContent log={log} />
        </div>
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Verwijder ${log.name}`}
        className="shrink-0 rounded-full p-2.5 text-muted-foreground transition-colors active:bg-surface-muted active:text-danger"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function FoodLogRowContent({ log }: { log: FoodLog }) {
  return (
    <>
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
    </>
  );
}

function MealSection({
  category,
  logs,
  onEdit,
  onDelete,
}: {
  category: MealCategory;
  logs: FoodLog[];
  onEdit: (log: FoodLog) => void;
  onDelete: (log: FoodLog) => void;
}) {
  const subtotalKcal = logs.reduce((sum, log) => sum + log.calories_kcal, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between bg-surface-muted px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">{MEAL_CATEGORY_LABELS[category]}</h3>
        <span className="text-xs text-muted-foreground">{Math.round(subtotalKcal)} kcal</span>
      </div>
      <ul className="divide-y divide-border">
        {logs.map((log) => (
          <li key={log.id}>
            <FoodLogRow log={log} onEdit={() => onEdit(log)} onDelete={() => onDelete(log)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TodayFoodList({ userId, dateISO }: { userId: string; dateISO: string }) {
  const { data: logs } = useFoodLogsForDate(userId, dateISO);
  const updateLog = useUpdateFoodLog(userId);
  const deleteLog = useDeleteFoodLog(userId);
  const label = relativeDayLabel(dateISO, todayISO());
  const isToday = label === "Vandaag";
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);

  const byCategory = new Map<MealCategory, FoodLog[]>();
  for (const log of logs ?? []) {
    byCategory.set(log.meal_category, [...(byCategory.get(log.meal_category) ?? []), log]);
  }

  async function handleEditConfirm(result: ProductAmountResult) {
    if (!editingLog) return;
    await updateLog.mutateAsync({
      log: editingLog,
      newAmount: result.amount,
      newUnit: result.unit,
      newMealCategory: result.mealCategory,
      newServingSize: result.servingSize,
      newServingUnit: result.servingUnit,
    });
    setEditingLog(null);
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
      {MEAL_CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => (
        <MealSection
          key={category}
          category={category}
          logs={byCategory.get(category)!}
          onEdit={setEditingLog}
          onDelete={(log) => deleteLog.mutate({ id: log.id, log_date: log.log_date })}
        />
      ))}

      {editingLog && (
        <ProductAmountPicker
          product={logToProduct(editingLog)}
          initialMealCategory={editingLog.meal_category}
          initialMeasureKey={initialSelectionForLog(editingLog).key}
          initialCount={initialSelectionForLog(editingLog).count}
          confirmLabel="Opslaan"
          onConfirm={handleEditConfirm}
          onCancel={() => setEditingLog(null)}
        />
      )}
    </div>
  );
}
