"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { DailyTargets } from "@/lib/types";

export function dailyTargetsKey(userId: string) {
  return ["daily_targets", userId] as const;
}

export function useDailyTargets(userId: string) {
  return useQuery({
    queryKey: dailyTargetsKey(userId),
    queryFn: async (): Promise<DailyTargets> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("daily_targets")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateDailyTargets(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Omit<DailyTargets, "user_id">>) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("daily_targets")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyTargetsKey(userId) });
    },
  });
}
