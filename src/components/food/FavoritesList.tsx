"use client";

import { Plus, X } from "lucide-react";
import { Card } from "@/components/ui";
import { useDeleteFoodItem, useFoodItems } from "@/lib/queries/foodItems";
import { useLogFoodItem } from "@/lib/queries/foodLogs";

export function FavoritesList({ userId, dateISO }: { userId: string; dateISO: string }) {
  const { data: items } = useFoodItems(userId);
  const logItem = useLogFoodItem(userId);
  const deleteItem = useDeleteFoodItem(userId);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-foreground">Snel loggen</h2>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 py-1.5">
            <button
              type="button"
              onClick={() => logItem.mutate({ item, logDate: dateISO })}
              disabled={logItem.isPending}
              className="flex flex-1 items-center gap-2 rounded-lg py-1 text-left transition-colors active:bg-surface-muted disabled:opacity-50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Plus size={16} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{item.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {Math.round(item.calories_kcal)} kcal · {Math.round(item.protein_g)}p / {Math.round(item.carbs_g)}k /{" "}
                  {Math.round(item.fat_g)}v
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => deleteItem.mutate(item.id)}
              aria-label={`Verwijder favoriet ${item.name}`}
              className="shrink-0 rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-danger active:bg-surface-muted active:text-danger"
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
