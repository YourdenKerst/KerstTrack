"use client";

import { Check, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Input } from "@/components/ui";
import { todayISO } from "@/lib/date";
import { useLogFoodItem } from "@/lib/queries/foodLogs";
import { useFoodItems } from "@/lib/queries/foodItems";
import { useUserId } from "@/lib/user-context";

export default function SearchFoodPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground">Laden…</div>}>
      <SearchFoodPageContent />
    </Suspense>
  );
}

function SearchFoodPageContent() {
  const userId = useUserId();
  const searchParams = useSearchParams();
  const dateISO = searchParams.get("date") ?? todayISO();
  const { data: items } = useFoodItems(userId);
  const logItem = useLogFoodItem(userId);
  const [query, setQuery] = useState("");
  const [loggedId, setLoggedId] = useState<string | null>(null);

  const filtered = (items ?? []).filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));

  async function handlePick(item: (typeof filtered)[number]) {
    await logItem.mutateAsync({ item, logDate: dateISO });
    setLoggedId(item.id);
    window.setTimeout(() => setLoggedId((current) => (current === item.id ? null : current)), 1500);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Zoek een product op naam…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {!items || items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nog geen producten opgeslagen — voeg iets toe via Nieuw of Scan.
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Niets gevonden voor &ldquo;{query}&rdquo;.</p>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handlePick(item)}
                disabled={logItem.isPending}
                className="flex w-full items-center justify-between gap-2 rounded-lg py-3 text-left transition-colors active:bg-surface-muted disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{item.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {Math.round(item.calories_kcal)} kcal · {Math.round(item.protein_g)}p / {Math.round(item.carbs_g)}k /{" "}
                    {Math.round(item.fat_g)}v
                  </span>
                </span>
                {loggedId === item.id && <Check size={18} className="shrink-0 text-success" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
