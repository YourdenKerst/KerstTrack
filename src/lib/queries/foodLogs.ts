"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { FoodItem, FoodLog } from "@/lib/types";

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
 * Logt een opgeslagen product, herschaald naar een opgegeven hoeveelheid in
 * gram/ml (t.o.v. het item's `reference_grams`). Zonder `grams` wordt het item
 * exact zo gelogd als opgeslagen.
 */
export function useLogFoodItem(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, logDate, grams }: { item: FoodItem; logDate: string; grams?: number }) => {
      const supabase = createClient();
      const amount = grams ?? item.reference_grams;
      const factor = amount / item.reference_grams;
      const { error } = await supabase.from("food_logs").insert({
        user_id: userId,
        food_item_id: item.id,
        name: item.name,
        image_url: item.image_url,
        amount,
        unit: item.unit,
        calories_kcal: Math.round(item.calories_kcal * factor * 100) / 100,
        protein_g: Math.round(item.protein_g * factor * 100) / 100,
        carbs_g: Math.round(item.carbs_g * factor * 100) / 100,
        fat_g: Math.round(item.fat_g * factor * 100) / 100,
        fiber_g: Math.round(item.fiber_g * factor * 100) / 100,
        log_date: logDate,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: foodLogsDateKey(userId, variables.logDate) });
    },
  });
}

/** Herschaalt een bestaande log naar een nieuwe hoeveelheid (achteraf aanpassen vanuit "Vandaag gegeten"). */
export function useUpdateFoodLogAmount(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ log, newAmount }: { log: FoodLog; newAmount: number }) => {
      if (!log.amount || log.amount <= 0) throw new Error("Geen basis-hoeveelheid bekend voor deze log.");
      const factor = newAmount / log.amount;
      const supabase = createClient();
      const { error } = await supabase
        .from("food_logs")
        .update({
          amount: newAmount,
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
