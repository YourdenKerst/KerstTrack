"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Supplement } from "@/lib/types";

export function supplementsKey(userId: string) {
  return ["supplements", userId] as const;
}

export function useSupplements(userId: string) {
  return useQuery({
    queryKey: supplementsKey(userId),
    queryFn: async (): Promise<Supplement[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("supplements")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Ook inactieve (verwijderde) supplementen — nodig voor het beheerscherm. */
export function useAllSupplements(userId: string) {
  return useQuery({
    queryKey: [...supplementsKey(userId), "all"],
    queryFn: async (): Promise<Supplement[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("supplements")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type NewSupplement = Pick<Supplement, "name" | "sort_order">;

export function useAddSupplement(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: NewSupplement): Promise<Supplement> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("supplements")
        .insert({ ...values, user_id: userId })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplementsKey(userId) });
    },
  });
}

export function useUpdateSupplement(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Supplement> & { id: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("supplements")
        .update(values)
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplementsKey(userId) });
    },
  });
}

/** Soft delete — behoudt streak-geschiedenis (zie SCHEMA.md). */
export function useDeactivateSupplement(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("supplements")
        .update({ is_active: false })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplementsKey(userId) });
    },
  });
}

/** Definitief verwijderen (incl. checkoff-geschiedenis, via on delete cascade) — alleen voor al-niet-actieve items. */
export function useDeleteSupplementPermanently(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("supplements").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplementsKey(userId) });
    },
  });
}
