"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button, FieldError, Input, Label } from "@/components/ui";
import { MICRONUTRIENT_META } from "@/lib/constants";
import { useAddFoodItem } from "@/lib/queries/foodItems";
import { useAddFoodLog } from "@/lib/queries/foodLogs";

const nullableNonNegative = z.number({ error: "Vul een getal in" }).finite().min(0).nullable();

const schema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  calories_kcal: z.number({ error: "Vul een getal in" }).finite().min(0, "Moet 0 of meer zijn"),
  protein_g: z.number({ error: "Vul een getal in" }).finite().min(0),
  carbs_g: z.number({ error: "Vul een getal in" }).finite().min(0),
  fat_g: z.number({ error: "Vul een getal in" }).finite().min(0),
  fiber_g: z.number({ error: "Vul een getal in" }).finite().min(0),
  saveAsFavorite: z.boolean(),
  reference_grams: z.number({ error: "Vul een getal in" }).positive("Moet groter dan 0 zijn"),
  vitamin_d_mcg: nullableNonNegative,
  magnesium_mg: nullableNonNegative,
  vitamin_b1_mg: nullableNonNegative,
  vitamin_b6_mg: nullableNonNegative,
  vitamin_b12_mcg: nullableNonNegative,
  omega3_mg: nullableNonNegative,
  zinc_mg: nullableNonNegative,
  potassium_mg: nullableNonNegative,
  calcium_mg: nullableNonNegative,
  iron_mg: nullableNonNegative,
});

export type FoodLogFormValues = z.infer<typeof schema>;

export const EMPTY_FOOD_LOG_VALUES: FoodLogFormValues = {
  name: "",
  calories_kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  saveAsFavorite: false,
  reference_grams: 100,
  vitamin_d_mcg: null,
  magnesium_mg: null,
  vitamin_b1_mg: null,
  vitamin_b6_mg: null,
  vitamin_b12_mcg: null,
  omega3_mg: null,
  zinc_mg: null,
  potassium_mg: null,
  calcium_mg: null,
  iron_mg: null,
};

/** Converteert een lege invoer naar null (= onbekend) i.p.v. NaN. */
const setValueAsNullableNumber = (raw: string) => (raw === "" ? null : Number(raw));

export function FoodLogForm({
  userId,
  dateISO,
  initialValues,
  barcode,
  disclaimer,
}: {
  userId: string;
  dateISO: string;
  initialValues?: FoodLogFormValues;
  barcode?: string | null;
  disclaimer?: string;
}) {
  const addFoodLog = useAddFoodLog(userId);
  const addFoodItem = useAddFoodItem(userId);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FoodLogFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? EMPTY_FOOD_LOG_VALUES,
  });
  const saveAsFavorite = useWatch({ control, name: "saveAsFavorite" });

  async function onSubmit(values: FoodLogFormValues) {
    const { saveAsFavorite, reference_grams, ...rest } = values;

    await addFoodLog.mutateAsync({ ...rest, log_date: dateISO, food_item_id: null });

    if (saveAsFavorite) {
      await addFoodItem.mutateAsync({ ...rest, barcode: barcode ?? null, reference_grams });
    }

    reset(EMPTY_FOOD_LOG_VALUES);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      {disclaimer && <p className="rounded-lg bg-warning-bg px-3 py-2 text-xs text-foreground">{disclaimer}</p>}

      <div>
        <Label htmlFor="name">Naam</Label>
        <Input id="name" placeholder="Bijv. skyr 300g" {...register("name")} />
        <FieldError>{errors.name?.message}</FieldError>
      </div>

      <div>
        <Label htmlFor="calories_kcal">Calorieën (kcal)</Label>
        <Input
          id="calories_kcal"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          {...register("calories_kcal", { valueAsNumber: true })}
        />
        <FieldError>{errors.calories_kcal?.message}</FieldError>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="protein_g">Eiwit (g)</Label>
          <Input
            id="protein_g"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            {...register("protein_g", { valueAsNumber: true })}
          />
        </div>
        <div>
          <Label htmlFor="carbs_g">Koolh. (g)</Label>
          <Input
            id="carbs_g"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            {...register("carbs_g", { valueAsNumber: true })}
          />
        </div>
        <div>
          <Label htmlFor="fat_g">Vet (g)</Label>
          <Input
            id="fat_g"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            {...register("fat_g", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="fiber_g">Vezels (g)</Label>
        <Input
          id="fiber_g"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          {...register("fiber_g", { valueAsNumber: true })}
        />
      </div>

      <details className="rounded-xl border border-border px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          Meer voedingsstoffen (optioneel)
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {MICRONUTRIENT_META.map((meta) => (
            <div key={meta.key}>
              <Label htmlFor={meta.key}>
                {meta.label} ({meta.unit})
              </Label>
              <Input
                id={meta.key}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder="onbekend"
                {...register(meta.key, { setValueAs: setValueAsNullableNumber })}
              />
              <FieldError>{errors[meta.key]?.message}</FieldError>
            </div>
          ))}
        </div>
      </details>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border accent-current text-primary"
          {...register("saveAsFavorite")}
        />
        Bewaar als favoriet voor later
      </label>

      {saveAsFavorite && (
        <div>
          <Label htmlFor="reference_grams">Bovenstaande waarden gelden voor hoeveel gram?</Label>
          <Input
            id="reference_grams"
            type="number"
            inputMode="decimal"
            min={1}
            step="any"
            {...register("reference_grams", { valueAsNumber: true })}
          />
          <FieldError>{errors.reference_grams?.message}</FieldError>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Zo kan dit product later kloppend herschaald worden, bv. als ingrediënt in een maaltijd.
          </p>
        </div>
      )}

      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? "Loggen…" : "Loggen"}
      </Button>
    </form>
  );
}
