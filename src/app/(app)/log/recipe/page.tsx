"use client";

import { ChefHat, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Card, ImageUploadField, Input, Label } from "@/components/ui";
import { RecipeIngredientPicker, type PickedIngredient } from "@/components/log/RecipeIngredientPicker";
import { scaleRecipeToGrams, sumRecipeIngredients, totalRecipeGrams } from "@/lib/calculations/recipes";
import { dashboardHref, todayISO } from "@/lib/date";
import { useAddFoodLog } from "@/lib/queries/foodLogs";
import {
  useAddRecipe,
  useAddRecipeIngredient,
  useDeleteRecipe,
  useRecipeIngredients,
  useRecipes,
} from "@/lib/queries/recipes";
import { useUserId } from "@/lib/user-context";

export default function RecipePage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground">Laden…</div>}>
      <RecipePageContent />
    </Suspense>
  );
}

function RecipePageContent() {
  const userId = useUserId();
  const searchParams = useSearchParams();
  const dateISO = searchParams.get("date") ?? todayISO();
  const { data: recipes } = useRecipes(userId);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (creating) {
    return <RecipeCreator userId={userId} onDone={() => setCreating(false)} />;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Stel een recept samen uit meerdere ingrediënten — bereken één keer de voedingswaarde, log daarna steeds
        hoeveel gram je als maaltijd ervan eet.
      </p>

      <button
        type="button"
        onClick={() => setCreating(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3.5 text-sm font-medium text-muted-foreground transition-colors active:border-primary active:text-primary"
      >
        <Plus size={16} /> Nieuw recept
      </button>

      {(!recipes || recipes.length === 0) && (
        <p className="py-6 text-center text-sm text-muted-foreground">Nog geen recepten aangemaakt.</p>
      )}

      <ul className="space-y-2">
        {(recipes ?? []).map((recipe) => (
          <li key={recipe.id}>
            <RecipeRow
              userId={userId}
              recipeId={recipe.id}
              name={recipe.name}
              imageUrl={recipe.image_url}
              dateISO={dateISO}
              expanded={expandedId === recipe.id}
              onToggle={() => setExpandedId((current) => (current === recipe.id ? null : recipe.id))}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecipeRow({
  userId,
  recipeId,
  name,
  imageUrl,
  dateISO,
  expanded,
  onToggle,
}: {
  userId: string;
  recipeId: string;
  name: string;
  imageUrl: string | null;
  dateISO: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { data: ingredients } = useRecipeIngredients(expanded ? recipeId : null);
  const deleteRecipe = useDeleteRecipe(userId);
  const addFoodLog = useAddFoodLog(userId);
  const router = useRouter();
  const totalGrams = ingredients ? totalRecipeGrams(ingredients) : 0;
  const [grams, setGrams] = useState<number | null>(null);

  async function handleLog() {
    if (!ingredients) return;
    const amount = grams ?? totalGrams;
    const scaled = scaleRecipeToGrams(ingredients, amount);
    await addFoodLog.mutateAsync({
      ...scaled,
      name: `${name} (${amount}g)`,
      image_url: imageUrl,
      recipe_id: recipeId,
      ingredient_count: ingredients.length,
      amount,
      unit: "g",
      log_date: dateISO,
      food_item_id: null,
    });
    router.push(dashboardHref(dateISO));
  }

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onToggle} className="flex flex-1 items-center gap-2 text-left">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- gebruikersfoto via Supabase Storage
            <img src={imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
          ) : (
            <ChefHat size={16} className="shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`"${name}" verwijderen?`)) deleteRecipe.mutate(recipeId);
          }}
          aria-label={`Verwijder ${name}`}
          className="shrink-0 rounded-full p-2.5 text-muted-foreground transition-colors active:bg-surface-muted active:text-danger"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && ingredients && (
        <div className="space-y-2 border-t border-border pt-2">
          <p className="text-[11px] text-muted-foreground">
            Totaal recept: {Math.round(totalGrams)}g · {Math.round(sumRecipeIngredients(ingredients).calories_kcal)}{" "}
            kcal · {ingredients.length} producten
          </p>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor={`grams-${recipeId}`}>Hoeveel gram loggen?</Label>
              <Input
                id={`grams-${recipeId}`}
                type="number"
                inputMode="decimal"
                min={1}
                step="any"
                placeholder={String(Math.round(totalGrams))}
                value={grams ?? ""}
                onChange={(e) => setGrams(e.target.value === "" ? null : Number(e.target.value))}
              />
            </div>
            <Button type="button" onClick={handleLog} disabled={addFoodLog.isPending}>
              {addFoodLog.isPending ? "Loggen…" : "Loggen"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function RecipeCreator({ userId, onDone }: { userId: string; onDone: () => void }) {
  const addRecipe = useAddRecipe(userId);
  const addIngredient = useAddRecipeIngredient(userId);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<PickedIngredient[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const totals = ingredients.length > 0 ? sumRecipeIngredients(ingredients) : null;
  const totalGrams = ingredients.reduce((sum, i) => sum + i.grams, 0);

  async function handleSave() {
    if (!name.trim() || ingredients.length === 0) return;
    setSaving(true);
    try {
      const recipe = await addRecipe.mutateAsync({ name: name.trim(), image_url: imageUrl });
      for (const [index, ingredient] of ingredients.entries()) {
        await addIngredient.mutateAsync({ ...ingredient, recipe_id: recipe.id, sort_order: index });
      }
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <ImageUploadField userId={userId} value={imageUrl} onChange={setImageUrl} />

      <div>
        <Label htmlFor="recipe-name">Naam van het recept</Label>
        <Input id="recipe-name" placeholder="Bijv. cake" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {ingredients.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border px-3">
          {ingredients.map((ingredient, index) => (
            <li key={index} className="flex items-center gap-2 py-2 text-sm">
              {ingredient.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- eigen/OFF-afbeelding, geen build-time optimalisatie nodig
                <img src={ingredient.image_url} alt="" className="h-7 w-7 shrink-0 rounded-lg object-cover" />
              ) : null}
              <span className="min-w-0 flex-1 truncate text-foreground">
                {ingredient.name} — {ingredient.grams}g
              </span>
              <button
                type="button"
                onClick={() => setIngredients((current) => current.filter((_, i) => i !== index))}
                aria-label={`Verwijder ${ingredient.name}`}
                className="shrink-0 rounded-full p-1.5 text-muted-foreground active:text-danger"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {totals && (
        <p className="text-xs text-muted-foreground">
          Totaal: {Math.round(totalGrams)}g · {Math.round(totals.calories_kcal)} kcal
        </p>
      )}

      {pickerOpen ? (
        <RecipeIngredientPicker
          userId={userId}
          onClose={() => setPickerOpen(false)}
          onPick={(ingredient) => {
            setIngredients((current) => [...current, ingredient]);
            setPickerOpen(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors active:border-primary active:text-primary"
        >
          <Plus size={16} /> Ingrediënt toevoegen
        </button>
      )}

      <div className="flex gap-2">
        <Button type="button" fullWidth onClick={handleSave} disabled={saving || !name.trim() || ingredients.length === 0}>
          {saving ? "Opslaan…" : "Recept opslaan"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Annuleren
        </Button>
      </div>
    </div>
  );
}
