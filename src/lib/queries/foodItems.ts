"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { FoodItem } from "@/lib/types";

export function foodItemsKey(userId: string) {
  return ["food_items", userId] as const;
}

export function useFoodItems(userId: string) {
  return useQuery({
    queryKey: foodItemsKey(userId),
    queryFn: async (): Promise<FoodItem[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("food_items")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Zoekt een eerder opgeslagen favoriet op barcode, zodat een herscan niet opnieuw Open Food Facts raakt. */
export async function findFoodItemByBarcode(userId: string, barcode: string): Promise<FoodItem | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("food_items")
    .select("*")
    .eq("user_id", userId)
    .eq("barcode", barcode)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type NewFoodItem = Omit<FoodItem, "id" | "user_id" | "created_at">;

export function useAddFoodItem(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: NewFoodItem): Promise<FoodItem> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("food_items")
        .insert({ ...values, user_id: userId })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: foodItemsKey(userId) });
    },
  });
}

export function useSetFoodItemFavorite(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase.from("food_items").update({ is_favorite }).eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: foodItemsKey(userId) });
    },
  });
}

export function useDeleteFoodItem(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("food_items")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: foodItemsKey(userId) });
    },
  });
}
