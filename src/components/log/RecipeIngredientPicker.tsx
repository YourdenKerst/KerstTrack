"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Barcode, Loader2, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BarcodeScanner } from "@/components/food/BarcodeScanner";
import { Button, Card, FieldError, Input, Label } from "@/components/ui";
import { lookupBarcodeProduct } from "@/lib/openFoodFacts";
import { useFoodItems } from "@/lib/queries/foodItems";
import type { FoodItem } from "@/lib/types";

/** Een ingrediënt zoals het aan een receptontwerp wordt toegevoegd — altijd per 100g. */
export interface PickedIngredient {
  name: string;
  grams: number;
  calories_kcal_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  fiber_g_per_100g: number;
  vitamin_d_mcg_per_100g: number | null;
  magnesium_mg_per_100g: number | null;
  vitamin_b1_mg_per_100g: number | null;
  vitamin_b6_mg_per_100g: number | null;
  vitamin_b12_mcg_per_100g: number | null;
  omega3_mg_per_100g: number | null;
  zinc_mg_per_100g: number | null;
  potassium_mg_per_100g: number | null;
  calcium_mg_per_100g: number | null;
  iron_mg_per_100g: number | null;
}

function fromFoodItem(item: FoodItem, grams: number): PickedIngredient {
  const factor = 100 / item.reference_grams;
  return {
    name: item.name,
    grams,
    calories_kcal_per_100g: item.calories_kcal * factor,
    protein_g_per_100g: item.protein_g * factor,
    carbs_g_per_100g: item.carbs_g * factor,
    fat_g_per_100g: item.fat_g * factor,
    fiber_g_per_100g: item.fiber_g * factor,
    vitamin_d_mcg_per_100g: item.vitamin_d_mcg == null ? null : item.vitamin_d_mcg * factor,
    magnesium_mg_per_100g: item.magnesium_mg == null ? null : item.magnesium_mg * factor,
    vitamin_b1_mg_per_100g: item.vitamin_b1_mg == null ? null : item.vitamin_b1_mg * factor,
    vitamin_b6_mg_per_100g: item.vitamin_b6_mg == null ? null : item.vitamin_b6_mg * factor,
    vitamin_b12_mcg_per_100g: item.vitamin_b12_mcg == null ? null : item.vitamin_b12_mcg * factor,
    omega3_mg_per_100g: item.omega3_mg == null ? null : item.omega3_mg * factor,
    zinc_mg_per_100g: item.zinc_mg == null ? null : item.zinc_mg * factor,
    potassium_mg_per_100g: item.potassium_mg == null ? null : item.potassium_mg * factor,
    calcium_mg_per_100g: item.calcium_mg == null ? null : item.calcium_mg * factor,
    iron_mg_per_100g: item.iron_mg == null ? null : item.iron_mg * factor,
  };
}

type PickerMode = "closed" | "search" | "new" | "scan";

export function RecipeIngredientPicker({
  userId,
  onPick,
  onClose,
}: {
  userId: string;
  onPick: (ingredient: PickedIngredient) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<PickerMode>("closed");

  if (mode === "closed") {
    return (
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setMode("search")}
          className="flex flex-col items-center gap-1 rounded-2xl border border-border py-3 text-xs font-medium text-foreground active:bg-surface-muted"
        >
          <Search size={18} /> Zoek
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          className="flex flex-col items-center gap-1 rounded-2xl border border-border py-3 text-xs font-medium text-foreground active:bg-surface-muted"
        >
          <Plus size={18} /> Nieuw
        </button>
        <button
          type="button"
          onClick={() => setMode("scan")}
          className="flex flex-col items-center gap-1 rounded-2xl border border-border py-3 text-xs font-medium text-foreground active:bg-surface-muted"
        >
          <Barcode size={18} /> Scan
        </button>
      </div>
    );
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Ingrediënt toevoegen</h3>
        <button
          type="button"
          onClick={() => {
            setMode("closed");
            onClose();
          }}
          aria-label="Annuleren"
          className="rounded-full p-2 text-muted-foreground active:bg-surface-muted"
        >
          <X size={16} />
        </button>
      </div>

      {mode === "search" && <SearchIngredient userId={userId} onPick={onPick} />}
      {mode === "new" && <NewIngredient onPick={onPick} />}
      {mode === "scan" && <ScanIngredient onPick={onPick} />}
    </Card>
  );
}

function SearchIngredient({ userId, onPick }: { userId: string; onPick: (i: PickedIngredient) => void }) {
  const { data: items } = useFoodItems(userId);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState(100);

  const filtered = (items ?? []).filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));

  if (selected) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">{selected.name}</p>
        <div>
          <Label htmlFor="ingredient-grams">Hoeveelheid (g)</Label>
          <Input
            id="ingredient-grams"
            type="number"
            inputMode="decimal"
            min={1}
            step="any"
            value={grams}
            onChange={(e) => setGrams(Number(e.target.value) || 0)}
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" fullWidth onClick={() => onPick(fromFoodItem(selected, grams))}>
            Toevoegen
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
            Terug
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input placeholder="Zoek een product op naam…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="max-h-64 divide-y divide-border overflow-y-auto">
        {filtered.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setSelected(item)}
              className="w-full py-2 text-left text-sm text-foreground active:bg-surface-muted"
            >
              {item.name}
            </button>
          </li>
        ))}
        {items && items.length > 0 && filtered.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">Niets gevonden.</p>
        )}
      </ul>
    </div>
  );
}

const newIngredientSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  calories_kcal_per_100g: z.number({ error: "Vul een getal in" }).finite().min(0),
  protein_g_per_100g: z.number({ error: "Vul een getal in" }).finite().min(0),
  carbs_g_per_100g: z.number({ error: "Vul een getal in" }).finite().min(0),
  fat_g_per_100g: z.number({ error: "Vul een getal in" }).finite().min(0),
  fiber_g_per_100g: z.number({ error: "Vul een getal in" }).finite().min(0),
  grams: z.number({ error: "Vul een getal in" }).positive("Moet groter dan 0 zijn"),
});
type NewIngredientValues = z.infer<typeof newIngredientSchema>;

function NewIngredient({ onPick }: { onPick: (i: PickedIngredient) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewIngredientValues>({
    resolver: zodResolver(newIngredientSchema),
    defaultValues: {
      name: "",
      calories_kcal_per_100g: 0,
      protein_g_per_100g: 0,
      carbs_g_per_100g: 0,
      fat_g_per_100g: 0,
      fiber_g_per_100g: 0,
      grams: 100,
    },
  });

  function onSubmit(values: NewIngredientValues) {
    onPick({
      ...values,
      vitamin_d_mcg_per_100g: null,
      magnesium_mg_per_100g: null,
      vitamin_b1_mg_per_100g: null,
      vitamin_b6_mg_per_100g: null,
      vitamin_b12_mcg_per_100g: null,
      omega3_mg_per_100g: null,
      zinc_mg_per_100g: null,
      potassium_mg_per_100g: null,
      calcium_mg_per_100g: null,
      iron_mg_per_100g: null,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <p className="text-[11px] text-muted-foreground">Vul de voedingswaarden in per 100 gram van dit ingrediënt.</p>
      <div>
        <Label htmlFor="ingredient-name">Naam</Label>
        <Input id="ingredient-name" placeholder="Bijv. bloem" {...register("name")} />
        <FieldError>{errors.name?.message}</FieldError>
      </div>
      <div>
        <Label htmlFor="ingredient-kcal">Calorieën per 100g (kcal)</Label>
        <Input
          id="ingredient-kcal"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          {...register("calories_kcal_per_100g", { valueAsNumber: true })}
        />
        <FieldError>{errors.calories_kcal_per_100g?.message}</FieldError>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="ingredient-protein">Eiwit (g)</Label>
          <Input
            id="ingredient-protein"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            {...register("protein_g_per_100g", { valueAsNumber: true })}
          />
        </div>
        <div>
          <Label htmlFor="ingredient-carbs">Koolh. (g)</Label>
          <Input
            id="ingredient-carbs"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            {...register("carbs_g_per_100g", { valueAsNumber: true })}
          />
        </div>
        <div>
          <Label htmlFor="ingredient-fat">Vet (g)</Label>
          <Input
            id="ingredient-fat"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            {...register("fat_g_per_100g", { valueAsNumber: true })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="ingredient-fiber">Vezels per 100g (g)</Label>
        <Input
          id="ingredient-fiber"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          {...register("fiber_g_per_100g", { valueAsNumber: true })}
        />
      </div>
      <div>
        <Label htmlFor="ingredient-grams-new">Hoeveelheid in dit recept (g)</Label>
        <Input
          id="ingredient-grams-new"
          type="number"
          inputMode="decimal"
          min={1}
          step="any"
          {...register("grams", { valueAsNumber: true })}
        />
        <FieldError>{errors.grams?.message}</FieldError>
      </div>
      <Button type="submit" fullWidth>
        Toevoegen
      </Button>
    </form>
  );
}

function ScanIngredient({ onPick }: { onPick: (i: PickedIngredient) => void }) {
  const [scannerOpen, setScannerOpen] = useState(true);
  const [status, setStatus] = useState<"idle" | "looking-up" | "not-found" | "error">("idle");
  const [grams, setGrams] = useState(100);
  const [product, setProduct] = useState<Awaited<ReturnType<typeof lookupBarcodeProduct>>>(null);

  async function handleDetected(barcode: string) {
    setScannerOpen(false);
    setStatus("looking-up");
    try {
      const result = await lookupBarcodeProduct(barcode);
      if (!result) {
        setStatus("not-found");
        return;
      }
      setProduct(result);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  if (product) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">{product.name ?? "Gescand product"}</p>
        <div>
          <Label htmlFor="scan-ingredient-grams">Hoeveelheid in dit recept (g)</Label>
          <Input
            id="scan-ingredient-grams"
            type="number"
            inputMode="decimal"
            min={1}
            step="any"
            value={grams}
            onChange={(e) => setGrams(Number(e.target.value) || 0)}
          />
        </div>
        <Button
          type="button"
          fullWidth
          onClick={() =>
            onPick({
              name: product.name ?? "Gescand product",
              grams,
              calories_kcal_per_100g: product.caloriesKcal ?? 0,
              protein_g_per_100g: product.proteinG ?? 0,
              carbs_g_per_100g: product.carbsG ?? 0,
              fat_g_per_100g: product.fatG ?? 0,
              fiber_g_per_100g: product.fiberG ?? 0,
              vitamin_d_mcg_per_100g: product.vitaminDMcg,
              magnesium_mg_per_100g: product.magnesiumMg,
              vitamin_b1_mg_per_100g: product.vitaminB1Mg,
              vitamin_b6_mg_per_100g: product.vitaminB6Mg,
              vitamin_b12_mcg_per_100g: product.vitaminB12Mcg,
              omega3_mg_per_100g: product.omega3Mg,
              zinc_mg_per_100g: product.zincMg,
              potassium_mg_per_100g: product.potassiumMg,
              calcium_mg_per_100g: product.calciumMg,
              iron_mg_per_100g: product.ironMg,
            })
          }
        >
          Toevoegen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {status === "looking-up" && (
        <p className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Opzoeken bij Open Food Facts…
        </p>
      )}
      {status === "not-found" && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Niet gevonden — gebruik &ldquo;Nieuw&rdquo; om het handmatig per 100g in te vullen.
        </p>
      )}
      {status === "error" && (
        <p className="py-4 text-center text-sm text-danger">Opzoeken is niet gelukt. Probeer het opnieuw.</p>
      )}
      {scannerOpen && <BarcodeScanner onDetected={handleDetected} onClose={() => setScannerOpen(false)} />}
    </div>
  );
}
