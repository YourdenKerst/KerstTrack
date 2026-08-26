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
 * gram (t.o.v. het item's `reference_grams`). Zonder `grams` wordt het item
 * exact zo gelogd als opgeslagen.
 */
export function useLogFoodItem(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, logDate, grams }: { item: FoodItem; logDate: string; grams?: number }) => {
      const supabase = createClient();
      const factor = grams != null ? grams / item.reference_grams : 1;
      const { error } = await supabase.from("food_logs").insert({
        user_id: userId,
        food_item_id: item.id,
        name: item.name,
        image_url: item.image_url,
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
