"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { profileKey } from "@/lib/queries/profiles";
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

      // Houd profiles.weight_kg gelijk aan de meest recente log (niet per se
      // déze log — je kunt ook een oudere datum aanvullen), zodat de
      // BMR-berekening in Profielinstellingen altijd met je actuele gewicht
      // rekent zonder dat je het daar apart hoeft bij te werken.
      const { data: latest } = await supabase
        .from("weight_logs")
        .select("weight_kg, log_date")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest) {
        await supabase
          .from("profiles")
          .update({ weight_kg: latest.weight_kg, updated_at: new Date().toISOString() })
          .eq("id", userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weight_logs", userId] });
      queryClient.invalidateQueries({ queryKey: profileKey(userId) });
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
