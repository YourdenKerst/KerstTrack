"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { WeightLog } from "@/lib/types";

export function weightLogsRecentKey(userId: string, limit: number) {
  return ["weight_logs", userId, "recent", limit] as const;
}

export function weightLogsRangeKey(userId: string, startISO: string, endISO: string) {
  return ["weight_logs", userId, "range", startISO, endISO] as const;
}

/** Meest recente N logs, nieuwste eerst — voor het dashboard-trendpijltje. */
export function useRecentWeightLogs(userId: string, limit = 2) {
  return useQuery({
    queryKey: weightLogsRecentKey(userId, limit),
    queryFn: async (): Promise<WeightLog[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Oplopend gesorteerd — voor de grafiek. */
export function useWeightLogsForRange(userId: string, startISO: string, endISO: string) {
  return useQuery({
    queryKey: weightLogsRangeKey(userId, startISO, endISO),
    queryFn: async (): Promise<WeightLog[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("weight_logs")
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

export function useUpsertWeightLog(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      weightKg,
      logDate,
      note,
    }: {
      weightKg: number;
      logDate: string;
      note?: string | null;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("weight_logs")
        .upsert(
          { user_id: userId, weight_kg: weightKg, log_date: logDate, note: note ?? null },
          { onConflict: "user_id,log_date" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weight_logs", userId] });
    },
  });
}

export function useDeleteWeightLog(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("weight_logs").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weight_logs", userId] });
    },
  });
}
