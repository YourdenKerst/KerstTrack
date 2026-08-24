"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { CorrectionCheckoff, TaskKey } from "@/lib/types";

export function correctionCheckoffsDateKey(userId: string, dateISO: string) {
  return ["correction_checkoffs", userId, dateISO] as const;
}

export function useCorrectionCheckoffsForDate(userId: string, dateISO: string) {
  return useQuery({
    queryKey: correctionCheckoffsDateKey(userId, dateISO),
    queryFn: async (): Promise<CorrectionCheckoff[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("correction_checkoffs")
        .select("*")
        .eq("user_id", userId)
        .eq("log_date", dateISO);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useToggleCorrectionCheckoff(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      logDate,
      taskKey,
      checked,
    }: {
      logDate: string;
      taskKey: TaskKey;
      checked: boolean;
    }) => {
      const supabase = createClient();
      if (checked) {
        const { error } = await supabase
          .from("correction_checkoffs")
          .upsert(
            { user_id: userId, log_date: logDate, task_key: taskKey },
            { onConflict: "user_id,log_date,task_key" },
          );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("correction_checkoffs")
          .delete()
          .eq("user_id", userId)
          .eq("log_date", logDate)
          .eq("task_key", taskKey);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: correctionCheckoffsDateKey(userId, variables.logDate),
      });
    },
  });
}
