"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AlcoholLog } from "@/lib/types";

export function alcoholLogDateKey(userId: string, dateISO: string) {
  return ["alcohol_logs", userId, "date", dateISO] as const;
}

export function alcoholLogsRangeKey(userId: string, startISO: string, endISO: string) {
  return ["alcohol_logs", userId, "range", startISO, endISO] as const;
}

/** Of er alcohol gelogd is op deze datum. */
export function useAlcoholLogForDate(userId: string, dateISO: string) {
  return useQuery({
    queryKey: alcoholLogDateKey(userId, dateISO),
    queryFn: async (): Promise<AlcoholLog | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("alcohol_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("log_date", dateISO)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAlcoholLogsForRange(userId: string, startISO: string, endISO: string) {
  return useQuery({
    queryKey: alcoholLogsRangeKey(userId, startISO, endISO),
    queryFn: async (): Promise<AlcoholLog[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("alcohol_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("log_date", startISO)
        .lte("log_date", endISO);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSetAlcoholLog(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ logDate, value }: { logDate: string; value: boolean }) => {
      const supabase = createClient();
      if (value) {
        const { error } = await supabase
          .from("alcohol_logs")
          .upsert({ user_id: userId, log_date: logDate }, { onConflict: "user_id,log_date" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("alcohol_logs")
          .delete()
          .eq("user_id", userId)
          .eq("log_date", logDate);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: alcoholLogDateKey(userId, variables.logDate) });
      queryClient.invalidateQueries({ queryKey: ["alcohol_logs", userId, "range"] });
    },
  });
}
