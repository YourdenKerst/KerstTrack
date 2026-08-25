"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, FieldError, Input, Label } from "@/components/ui";
import {
  calculateAge,
  calculateRecommendedTargets,
  GOAL_PLANS,
  type ActivityLevel,
  type GoalPlan,
} from "@/lib/calculations/recommendedTargets";
import { MICRONUTRIENT_META } from "@/lib/constants";
import { todayISO } from "@/lib/date";
import { useDailyTargets, useUpdateDailyTargets } from "@/lib/queries/dailyTargets";
import { useProfile } from "@/lib/queries/profiles";

const nonNegative = z.number({ error: "Vul een getal in" }).nonnegative();

const schema = z.object({
  calories_kcal: z.number({ error: "Vul een getal in" }).positive("Moet groter dan 0 zijn"),
  protein_g: nonNegative,
  carbs_g: nonNegative,
  fat_g: nonNegative,
  fiber_g: nonNegative,
  water_ml: z.number({ error: "Vul een getal in" }).positive("Moet groter dan 0 zijn"),
  alcohol_extra_water_ml: nonNegative,
  vitamin_d_mcg: nonNegative,
  magnesium_mg: nonNegative,
  vitamin_b1_mg: nonNegative,
  vitamin_b6_mg: nonNegative,
  vitamin_b12_mcg: nonNegative,
  omega3_mg: nonNegative,
  zinc_mg: nonNegative,
  potassium_mg: nonNegative,
  calcium_mg: nonNegative,
  iron_mg: nonNegative,
});

type FormValues = z.infer<typeof schema>;

export function TargetsForm({ userId }: { userId: string }) {
  const { data: targets } = useDailyTargets(userId);
  const { data: profile } = useProfile(userId);
  const update = useUpdateDailyTargets(userId);
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (targets) {
      reset({
        calories_kcal: targets.calories_kcal,
        protein_g: targets.protein_g,
        carbs_g: targets.carbs_g,
        fat_g: targets.fat_g,
        fiber_g: targets.fiber_g,
        water_ml: targets.water_ml,
        alcohol_extra_water_ml: targets.alcohol_extra_water_ml,
        vitamin_d_mcg: targets.vitamin_d_mcg,
        magnesium_mg: targets.magnesium_mg,
        vitamin_b1_mg: targets.vitamin_b1_mg,
        vitamin_b6_mg: targets.vitamin_b6_mg,
        vitamin_b12_mcg: targets.vitamin_b12_mcg,
        omega3_mg: targets.omega3_mg,
        zinc_mg: targets.zinc_mg,
        potassium_mg: targets.potassium_mg,
        calcium_mg: targets.calcium_mg,
        iron_mg: targets.iron_mg,
      });
    }
  }, [targets, reset]);

  const missingProfileFields =
    !profile?.weight_kg || !profile?.height_cm || !profile?.sex || !profile?.birth_date || !profile?.goal;
  const goalPlan = GOAL_PLANS.find((g) => g.key === profile?.goal);

  function handleCalculate() {
    if (!profile?.weight_kg || !profile?.height_cm || !profile?.sex || !profile?.birth_date || !profile?.goal) return;

    const recommended = calculateRecommendedTargets({
      weightKg: profile.weight_kg,
      heightCm: profile.height_cm,
      age: calculateAge(profile.birth_date, todayISO()),
      sex: profile.sex,
      activityLevel: (profile.activity_level as ActivityLevel) ?? "light",
      goal: profile.goal as GoalPlan,
      paceKgPerWeek: profile.goal_pace_kg_per_week ?? undefined,
    });

    reset({ ...recommended, alcohol_extra_water_ml: getValues("alcohol_extra_water_ml") ?? 500 });
  }

  async function onSubmit(values: FormValues) {
    await update.mutateAsync(values);
    reset(values);
  }

  if (!targets) return <p className="text-sm text-muted-foreground">Laden…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface-muted p-3">
        <p className="mb-2 text-sm font-medium text-foreground">Aanbevolen doel</p>
        {missingProfileFields ? (
          <p className="text-xs text-muted-foreground">
            Vul bij Profiel eerst gewicht, lengte, geslacht, geboortedatum en doel in om je doelen automatisch te
            laten berekenen (Mifflin-St Jeor).
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <p className="flex-1 text-xs text-muted-foreground">
              Doel: <span className="font-medium text-foreground">{goalPlan?.label}</span>
              {profile?.goal_pace_kg_per_week != null && goalPlan?.paceRange
                ? ` · ${profile.goal_pace_kg_per_week.toFixed(2)} kg/week`
                : ""}
            </p>
            <Button type="button" variant="secondary" onClick={handleCalculate}>
              Bereken en vul in
            </Button>
          </div>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Vult alle velden hieronder in — controleer en pas aan waar nodig, en klik daarna op Opslaan. Doel en
          tempo pas je aan bij Profiel.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="calories_kcal">Calorieën (kcal)</Label>
            <Input
              id="calories_kcal"
              type="number"
              step="any"
              {...register("calories_kcal", { valueAsNumber: true })}
            />
            <FieldError>{errors.calories_kcal?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="water_ml">Water (ml)</Label>
            <Input id="water_ml" type="number" step="any" {...register("water_ml", { valueAsNumber: true })} />
            <FieldError>{errors.water_ml?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="protein_g">Eiwit (g)</Label>
            <Input id="protein_g" type="number" step="any" {...register("protein_g", { valueAsNumber: true })} />
            <FieldError>{errors.protein_g?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="carbs_g">Koolhydraten (g)</Label>
            <Input id="carbs_g" type="number" step="any" {...register("carbs_g", { valueAsNumber: true })} />
            <FieldError>{errors.carbs_g?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="fat_g">Vet (g)</Label>
            <Input id="fat_g" type="number" step="any" {...register("fat_g", { valueAsNumber: true })} />
            <FieldError>{errors.fat_g?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="fiber_g">Vezels (g)</Label>
            <Input id="fiber_g" type="number" step="any" {...register("fiber_g", { valueAsNumber: true })} />
            <FieldError>{errors.fiber_g?.message}</FieldError>
          </div>
        </div>
        <div>
          <Label htmlFor="alcohol_extra_water_ml">Extra water na een alcoholdag (ml)</Label>
          <Input
            id="alcohol_extra_water_ml"
            type="number"
            step="any"
            {...register("alcohol_extra_water_ml", { valueAsNumber: true })}
          />
          <FieldError>{errors.alcohol_extra_water_ml?.message}</FieldError>
        </div>

        <details className="rounded-xl border border-border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-foreground">Micronutriënt-doelen</summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {MICRONUTRIENT_META.map((meta) => (
              <div key={meta.key}>
                <Label htmlFor={meta.key}>
                  {meta.label} ({meta.unit})
                </Label>
                <Input id={meta.key} type="number" step="any" {...register(meta.key, { valueAsNumber: true })} />
                <FieldError>{errors[meta.key]?.message}</FieldError>
              </div>
            ))}
          </div>
        </details>

        <Button type="submit" disabled={isSubmitting || !isDirty} fullWidth>
          {isSubmitting ? "Opslaan…" : "Opslaan"}
        </Button>
      </form>
    </div>
  );
}
