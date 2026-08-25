"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Recipe, RecipeIngredient } from "@/lib/types";

export function recipesKey(userId: string) {
  return ["recipes", userId] as const;
}

export function recipeIngredientsKey(recipeId: string) {
  return ["recipe_ingredients", recipeId] as const;
}

export function useRecipes(userId: string) {
  return useQuery({
    queryKey: recipesKey(userId),
    queryFn: async (): Promise<Recipe[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecipeIngredients(recipeId: string | null) {
  return useQuery({
    queryKey: recipeIngredientsKey(recipeId ?? ""),
    queryFn: async (): Promise<RecipeIngredient[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select("*")
        .eq("recipe_id", recipeId as string)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: recipeId !== null,
  });
}

export function useAddRecipe(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<Recipe> => {
      const supabase = createClient();
      const { data, error } = await supabase.from("recipes").insert({ name, user_id: userId }).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipesKey(userId) });
    },
  });
}

export function useDeleteRecipe(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("recipes").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipesKey(userId) });
    },
  });
}

export type NewRecipeIngredient = Omit<RecipeIngredient, "id" | "user_id" | "created_at">;

export function useAddRecipeIngredient(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: NewRecipeIngredient) => {
      const supabase = createClient();
      const { error } = await supabase.from("recipe_ingredients").insert({ ...values, user_id: userId });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: recipeIngredientsKey(variables.recipe_id) });
    },
  });
}

export function useDeleteRecipeIngredient(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; recipeId: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("recipe_ingredients").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: recipeIngredientsKey(variables.recipeId) });
    },
  });
}
