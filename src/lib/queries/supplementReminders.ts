"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RecurrenceType, SupplementReminder } from "@/lib/types";

export function supplementRemindersKey(supplementId: string) {
  return ["supplement_reminders", supplementId] as const;
}

export function allSupplementRemindersKey(userId: string) {
  return ["supplement_reminders", "all", userId] as const;
}

export function useSupplementReminders(supplementId: string) {
  return useQuery({
    queryKey: supplementRemindersKey(supplementId),
    queryFn: async (): Promise<SupplementReminder[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("supplement_reminders")
        .select("*")
        .eq("supplement_id", supplementId)
        .order("slot", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Alle meldingsmomenten van de gebruiker, voor de client-side plannings-logica (zie SupplementReminders.tsx). */
export function useAllSupplementReminders(userId: string) {
  return useQuery({
    queryKey: allSupplementRemindersKey(userId),
    queryFn: async (): Promise<SupplementReminder[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.from("supplement_reminders").select("*").eq("user_id", userId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface ReminderSlotInput {
  slot: number;
  reminder_time: string;
  recurrence_type: RecurrenceType;
  recurrence_n: number | null;
  recurrence_weekday: number | null;
}

/** Vervangt in één keer alle meldingsmomenten van een supplement (max. 3 slots). */
export function useSetSupplementReminders(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ supplementId, slots }: { supplementId: string; slots: ReminderSlotInput[] }) => {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("supplement_reminders")
        .delete()
        .eq("supplement_id", supplementId)
        .eq("user_id", userId);
      if (deleteError) throw deleteError;

      if (slots.length === 0) return;

      const { error: insertError } = await supabase
        .from("supplement_reminders")
        .insert(slots.map((slot) => ({ ...slot, supplement_id: supplementId, user_id: userId })));
      if (insertError) throw insertError;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: supplementRemindersKey(variables.supplementId) });
      queryClient.invalidateQueries({ queryKey: allSupplementRemindersKey(userId) });
    },
  });
}
