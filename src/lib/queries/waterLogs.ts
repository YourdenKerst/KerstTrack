"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { WaterLog } from "@/lib/types";

export function waterLogsDateKey(userId: string, dateISO: string) {
  return ["water_logs", userId, "date", dateISO] as const;
}

export function waterLogsRangeKey(userId: string, startISO: string, endISO: string) {
  return ["water_logs", userId, "range", startISO, endISO] as const;
}

export function useWaterLogsForDate(userId: string, dateISO: string) {
  return useQuery({
    queryKey: waterLogsDateKey(userId, dateISO),
    queryFn: async (): Promise<WaterLog[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("water_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("log_date", dateISO)
        .order("logged_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWaterLogsForRange(userId: string, startISO: string, endISO: string) {
  return useQuery({
    queryKey: waterLogsRangeKey(userId, startISO, endISO),
    queryFn: async (): Promise<WaterLog[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("water_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("log_date", startISO)
        .lte("log_date", endISO);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddWaterLog(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ amountMl, logDate }: { amountMl: number; logDate: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("water_logs")
        .insert({ user_id: userId, amount_ml: amountMl, log_date: logDate });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: waterLogsDateKey(userId, variables.logDate) });
    },
  });
}

export function useDeleteWaterLog(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; logDate: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("water_logs").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: waterLogsDateKey(userId, variables.logDate) });
    },
  });
}
