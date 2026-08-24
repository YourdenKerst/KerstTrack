"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { SupplementLog } from "@/lib/types";

export function supplementLogsDateKey(userId: string, dateISO: string) {
  return ["supplement_logs", userId, "date", dateISO] as const;
}

export function supplementLogsRangeKey(userId: string, startISO: string, endISO: string) {
  return ["supplement_logs", userId, "range", startISO, endISO] as const;
}

export function useSupplementLogsForDate(userId: string, dateISO: string) {
  return useQuery({
    queryKey: supplementLogsDateKey(userId, dateISO),
    queryFn: async (): Promise<SupplementLog[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("supplement_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("log_date", dateISO);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSupplementLogsForRange(userId: string, startISO: string, endISO: string) {
  return useQuery({
    queryKey: supplementLogsRangeKey(userId, startISO, endISO),
    queryFn: async (): Promise<SupplementLog[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("supplement_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("log_date", startISO)
        .lte("log_date", endISO);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useToggleSupplementLog(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      supplementId,
      logDate,
      checked,
    }: {
      supplementId: string;
      logDate: string;
      checked: boolean;
    }) => {
      const supabase = createClient();
      if (checked) {
        const { error } = await supabase
          .from("supplement_logs")
          .insert({ user_id: userId, supplement_id: supplementId, log_date: logDate });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("supplement_logs")
          .delete()
          .eq("supplement_id", supplementId)
          .eq("log_date", logDate)
          .eq("user_id", userId);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: supplementLogsDateKey(userId, variables.logDate) });
      queryClient.invalidateQueries({ queryKey: ["supplement_logs", userId, "range"] });
    },
  });
}
