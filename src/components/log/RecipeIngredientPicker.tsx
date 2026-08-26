"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Barcode, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BarcodeScanner } from "@/components/food/BarcodeScanner";
import { Button, Card, FieldError, ImageUploadField, Input, Label } from "@/components/ui";
import { lookupBarcodeProduct, searchProductsByName, type OpenFoodFactsProduct } from "@/lib/openFoodFacts";
import { useFoodItems } from "@/lib/queries/foodItems";
import type { FoodItem } from "@/lib/types";

/** Een ingrediënt zoals het aan een receptontwerp wordt toegevoegd — altijd per 100g. */
export interface PickedIngredient {
  name: string;
  image_url: string | null;
  grams: number;
  calories_kcal_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  fiber_g_per_100g: number;
}

function fromFoodItem(item: FoodItem, grams: number): PickedIngredient {
  const factor = 100 / item.reference_grams;
  return {
    name: item.name,
    image_url: item.image_url,
    grams,
    calories_kcal_per_100g: item.calories_kcal * factor,
    protein_g_per_100g: item.protein_g * factor,
    carbs_g_per_100g: item.carbs_g * factor,
    fat_g_per_100g: item.fat_g * factor,
    fiber_g_per_100g: item.fiber_g * factor,
  };
}

function fromOffProduct(product: OpenFoodFactsProduct, grams: number): PickedIngredient {
  return {
    name: product.name ?? "Product",
    image_url: product.imageUrl,
    grams,
    calories_kcal_per_100g: product.caloriesKcal ?? 0,
    protein_g_per_100g: product.proteinG ?? 0,
    carbs_g_per_100g: product.carbsG ?? 0,
    fat_g_per_100g: product.fatG ?? 0,
    fiber_g_per_100g: product.fiberG ?? 0,
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
      {mode === "new" && <NewIngredient userId={userId} onPick={onPick} />}
      {mode === "scan" && <ScanIngredient onPick={onPick} />}
    </Card>
  );
}

function SearchIngredient({ userId, onPick }: { userId: string; onPick: (i: PickedIngredient) => void }) {
  const { data: items } = useFoodItems(userId);
  const [query, setQuery] = useState("");
  const [selectedLocal, setSelectedLocal] = useState<FoodItem | null>(null);
  const [selectedOff, setSelectedOff] = useState<OpenFoodFactsProduct | null>(null);
  const [offResults, setOffResults] = useState<OpenFoodFactsProduct[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [grams, setGrams] = useState(100);

  const filtered = (items ?? []).filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }
    const timeout = window.setTimeout(async () => {
      setOffLoading(true);
      try {
        const results = await searchProductsByName(trimmed, 8);
        const localBarcodes = new Set((items ?? []).map((i) => i.barcode).filter(Boolean));
        setOffResults(results.filter((r) => !localBarcodes.has(r.barcode)));
      } finally {
        setOffLoading(false);
      }
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [query, items]);

  const selectedName = selectedLocal?.name ?? selectedOff?.name;
  if (selectedName) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">{selectedName}</p>
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
          <Button
            type="button"
            fullWidth
            onClick={() => onPick(selectedLocal ? fromFoodItem(selectedLocal, grams) : fromOffProduct(selectedOff!, grams))}
          >
            Toevoegen
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSelectedLocal(null);
              setSelectedOff(null);
            }}
          >
            Terug
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Input placeholder="Zoek een product op naam…" value={query} onChange={(e) => setQuery(e.target.value)} />

      {filtered.length > 0 && (
        <div>
          <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Jouw producten
          </h4>
          <ul className="max-h-40 divide-y divide-border overflow-y-auto">
            {filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedLocal(item)}
                  className="w-full py-2 text-left text-sm text-foreground active:bg-surface-muted"
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {query.trim().length >= 2 && (
        <div>
          <h4 className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Open Food Facts
            {offLoading && <Loader2 size={10} className="animate-spin" />}
          </h4>
          <ul className="max-h-40 divide-y divide-border overflow-y-auto">
            {offResults.map((product) => (
              <li key={product.barcode}>
                <button
                  type="button"
                  onClick={() => setSelectedOff(product)}
                  className="w-full py-2 text-left text-sm text-foreground active:bg-surface-muted"
                >
                  {product.name ?? "Onbekend product"}
                </button>
              </li>
            ))}
            {offResults.length === 0 && !offLoading && (
              <p className="py-2 text-sm text-muted-foreground">Niets gevonden.</p>
            )}
          </ul>
        </div>
      )}
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

function NewIngredient({ userId, onPick }: { userId: string; onPick: (i: PickedIngredient) => void }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
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
    onPick({ ...values, image_url: imageUrl });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <p className="text-[11px] text-muted-foreground">Vul de voedingswaarden in per 100 gram van dit ingrediënt.</p>
      <ImageUploadField userId={userId} value={imageUrl} onChange={setImageUrl} />
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
  const [product, setProduct] = useState<OpenFoodFactsProduct | null>(null);

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
        <Button type="button" fullWidth onClick={() => onPick(fromOffProduct(product, grams))}>
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
