"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, FieldError, ImageUploadField, Input, Label } from "@/components/ui";
import { dashboardHref } from "@/lib/date";
import { useAddFoodItem } from "@/lib/queries/foodItems";

const schema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  brand: z.string().nullable(),
  calories_kcal: z.number({ error: "Vul een getal in" }).finite().min(0, "Moet 0 of meer zijn"),
  protein_g: z.number({ error: "Vul een getal in" }).finite().min(0),
  carbs_g: z.number({ error: "Vul een getal in" }).finite().min(0),
  fat_g: z.number({ error: "Vul een getal in" }).finite().min(0),
});

export type NewFoodItemFormValues = z.infer<typeof schema>;

export const EMPTY_NEW_FOOD_ITEM_VALUES: NewFoodItemFormValues = {
  name: "",
  brand: null,
  calories_kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
};

const setValueAsNullableText = (raw: string) => (raw === "" ? null : raw);

export function NewFoodItemForm({
  userId,
  initialValues,
  initialImageUrl,
  barcode,
  dateISO,
  disclaimer,
}: {
  userId: string;
  initialValues?: NewFoodItemFormValues;
  initialImageUrl?: string | null;
  barcode?: string | null;
  dateISO?: string;
  disclaimer?: string;
}) {
  const addFoodItem = useAddFoodItem(userId);
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl ?? null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewFoodItemFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? EMPTY_NEW_FOOD_ITEM_VALUES,
  });

  async function onSubmit(values: NewFoodItemFormValues) {
    await addFoodItem.mutateAsync({
      ...values,
      fiber_g: 0,
      barcode: barcode ?? null,
      image_url: imageUrl,
      reference_grams: 100,
      unit: "g",
      serving_size: null,
      is_favorite: true,
    });
    router.push(dateISO ? dashboardHref(dateISO) : "/");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      {disclaimer && <p className="rounded-lg bg-warning-bg px-3 py-2 text-xs text-foreground">{disclaimer}</p>}

      <p className="text-[11px] text-muted-foreground">Vul de voedingswaarden in per 100 gram.</p>

      <ImageUploadField userId={userId} value={imageUrl} onChange={setImageUrl} />

      <div>
        <Label htmlFor="name">Naam</Label>
        <Input id="name" placeholder="Bijv. skyr" {...register("name")} />
        <FieldError>{errors.name?.message}</FieldError>
      </div>

      <div>
        <Label htmlFor="brand">Merk (optioneel)</Label>
        <Input
          id="brand"
          placeholder="Bijv. Arla"
          {...register("brand", { setValueAs: setValueAsNullableText })}
        />
      </div>

      <div>
        <Label htmlFor="calories_kcal">Calorieën per 100g (kcal)</Label>
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

      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? "Toevoegen…" : "Product toevoegen"}
      </Button>
    </form>
  );
}
