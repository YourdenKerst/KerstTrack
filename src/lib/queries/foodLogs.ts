"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { FoodLog, MealCategory, Unit } from "@/lib/types";

export function foodLogsDateKey(userId: string, dateISO: string) {
  return ["food_logs", userId, dateISO] as const;
}

export function foodLogsRangeKey(userId: string, startISO: string, endISO: string) {
  return ["food_logs", userId, "range", startISO, endISO] as const;
}

export function useFoodLogsForDate(userId: string, dateISO: string) {
  return useQuery({
    queryKey: foodLogsDateKey(userId, dateISO),
    queryFn: async (): Promise<FoodLog[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("log_date", dateISO)
        .order("logged_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFoodLogsForRange(userId: string, startISO: string, endISO: string) {
  return useQuery({
    queryKey: foodLogsRangeKey(userId, startISO, endISO),
    queryFn: async (): Promise<FoodLog[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("log_date", startISO)
        .lte("log_date", endISO)
        .order("log_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type NewFoodLog = Omit<FoodLog, "id" | "user_id" | "logged_at">;

export function useAddFoodLog(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: NewFoodLog) => {
      const supabase = createClient();
      const { error } = await supabase.from("food_logs").insert({ ...values, user_id: userId });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: foodLogsDateKey(userId, variables.log_date) });
    },
  });
}

/**
 * Herschaalt een bestaande log naar een nieuwe hoeveelheid/eenheid/maaltijd-
 * categorie (achteraf aanpassen vanuit "Vandaag gegeten", via dezelfde
 * maten-kiezer als bij het loggen zelf). De macro's staan altijd gedenormali-
 * seerd t.o.v. `log.amount` (zie tabel-notitie in schema.sql) — de her-
 * schaalfactor is dus altijd `newAmount / log.amount`, ongeacht of de eenheid
 * meeverandert (bv. van gram naar een ml-maat): dat is puur een weergave-
 * label, geen ander referentiepunt voor de voedingswaarden.
 */
export function useUpdateFoodLog(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      log,
      newAmount,
      newUnit,
      newMealCategory,
      newServingSize,
      newServingUnit,
    }: {
      log: FoodLog;
      newAmount: number;
      newUnit: Unit;
      newMealCategory: MealCategory;
      newServingSize: number | null;
      newServingUnit: Unit | null;
    }) => {
      if (!log.amount || log.amount <= 0) throw new Error("Geen basis-hoeveelheid bekend voor deze log.");
      const factor = newAmount / log.amount;
      const supabase = createClient();
      const { error } = await supabase
        .from("food_logs")
        .update({
          amount: newAmount,
          unit: newUnit,
          serving_size: newServingSize,
          serving_unit: newServingUnit,
          meal_category: newMealCategory,
          calories_kcal: Math.round(log.calories_kcal * factor * 100) / 100,
          protein_g: Math.round(log.protein_g * factor * 100) / 100,
          carbs_g: Math.round(log.carbs_g * factor * 100) / 100,
          fat_g: Math.round(log.fat_g * factor * 100) / 100,
          fiber_g: Math.round(log.fiber_g * factor * 100) / 100,
        })
        .eq("id", log.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: foodLogsDateKey(userId, variables.log.log_date) });
    },
  });
}

export function useDeleteFoodLog(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; log_date: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("food_logs").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: foodLogsDateKey(userId, variables.log_date) });
    },
  });
}
