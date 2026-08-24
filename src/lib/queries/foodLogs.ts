"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MICRONUTRIENT_META } from "@/lib/constants";
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

/** Log een favoriet met 1 tap: kopieert de macro's van het food_item naar een nieuwe log-rij. */
export function useLogFoodItem(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, logDate }: { item: FoodItem; logDate: string }) => {
      const supabase = createClient();
      const micronutrients = Object.fromEntries(MICRONUTRIENT_META.map(({ key }) => [key, item[key]]));
      const { error } = await supabase.from("food_logs").insert({
        user_id: userId,
        food_item_id: item.id,
        name: item.name,
        calories_kcal: item.calories_kcal,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        fiber_g: item.fiber_g,
        log_date: logDate,
        ...micronutrients,
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
