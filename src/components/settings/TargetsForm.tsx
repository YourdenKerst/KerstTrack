"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, FieldError, Input, Label, Select } from "@/components/ui";
import {
  calculateAge,
  calculateRecommendedTargets,
  GOAL_PLANS,
  type ActivityLevel,
  type GoalPlan,
} from "@/lib/calculations/recommendedTargets";
import { todayISO } from "@/lib/date";
import { useDailyTargets, useUpdateDailyTargets } from "@/lib/queries/dailyTargets";
import { useProfile, useUpdateProfile } from "@/lib/queries/profiles";
import type { Profile } from "@/lib/types";

const nonNegative = z.number({ error: "Vul een getal in" }).nonnegative();

const schema = z.object({
  calories_kcal: z.number({ error: "Vul een getal in" }).positive("Moet groter dan 0 zijn"),
  protein_g: nonNegative,
  carbs_g: nonNegative,
  fat_g: nonNegative,
  fiber_g: nonNegative,
  water_ml: z.number({ error: "Vul een getal in" }).positive("Moet groter dan 0 zijn"),
  alcohol_extra_water_ml: nonNegative,
});

type FormValues = z.infer<typeof schema>;

interface CompleteProfile extends Profile {
  weight_kg: number;
  height_cm: number;
  sex: NonNullable<Profile["sex"]>;
  birth_date: string;
}

function GoalPaceEditor({
  profile,
  onCalculate,
}: {
  profile: CompleteProfile;
  onCalculate: (goal: GoalPlan, pace: number | null) => Promise<void>;
}) {
  const [goal, setGoal] = useState<GoalPlan | null>((profile.goal as GoalPlan | null) ?? null);
  const [pace, setPace] = useState<number | null>(profile.goal_pace_kg_per_week);
  const [calculating, setCalculating] = useState(false);

  const goalPlan = GOAL_PLANS.find((g) => g.key === goal);
  const inDanger = Boolean(goalPlan?.paceRange && pace != null && pace > goalPlan.paceRange.dangerAbove);

  function handleGoalChange(value: string) {
    const nextGoal = (value || null) as GoalPlan | null;
    setGoal(nextGoal);
    const nextPlan = GOAL_PLANS.find((g) => g.key === nextGoal);
    setPace(nextPlan?.paceRange?.default ?? null);
  }

  async function handleCalculate() {
    if (!goal) return;
    setCalculating(true);
    try {
      await onCalculate(goal, pace);
    } finally {
      setCalculating(false);
    }
  }

  return (
    <div className="space-y-3">
      <Select value={goal ?? ""} onChange={(e) => handleGoalChange(e.target.value)}>
        <option value="">Niet ingevuld</option>
        {GOAL_PLANS.map((plan) => (
          <option key={plan.key} value={plan.key}>
            {plan.label}
          </option>
        ))}
      </Select>

      {goalPlan?.paceRange && (
        <div>
          <Label>
            Tempo: {(pace ?? goalPlan.paceRange.default).toFixed(2)} kg per week{" "}
            {goalPlan.direction < 0 ? "verliezen" : "erbij"}
          </Label>
          <input
            type="range"
            min={goalPlan.paceRange.min}
            max={goalPlan.paceRange.max}
            step={goalPlan.paceRange.step}
            value={pace ?? goalPlan.paceRange.default}
            onChange={(e) => setPace(Number(e.target.value))}
            className="h-2 w-full appearance-none rounded-full accent-foreground"
            style={{
              background: `linear-gradient(to right, var(--success-cell) 0%, var(--success-cell) ${
                ((goalPlan.paceRange.dangerAbove - goalPlan.paceRange.min) /
                  (goalPlan.paceRange.max - goalPlan.paceRange.min)) *
                100
              }%, var(--danger-cell) ${
                ((goalPlan.paceRange.dangerAbove - goalPlan.paceRange.min) /
                  (goalPlan.paceRange.max - goalPlan.paceRange.min)) *
                100
              }%, var(--danger-cell) 100%)`,
            }}
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Rustig ({goalPlan.paceRange.min} kg/week)</span>
            <span>Snel ({goalPlan.paceRange.max} kg/week)</span>
          </div>
          {inDanger && (
            <p className="mt-2 rounded-lg bg-warning-bg px-3 py-2 text-xs text-foreground">
              Dit tempo is agressiever dan doorgaans wordt aangeraden en kan gepaard gaan met meer spierverlies,
              vermoeidheid of een groter risico op terugval. Overweeg een rustiger tempo, of overleg dit met een
              arts of diëtist.
            </p>
          )}
        </div>
      )}

      <Button type="button" variant="secondary" fullWidth onClick={handleCalculate} disabled={calculating || !goal}>
        {calculating ? "Bezig…" : "Bereken en vul in"}
      </Button>
    </div>
  );
}

export function TargetsForm({ userId }: { userId: string }) {
  const { data: targets } = useDailyTargets(userId);
  const { data: profile } = useProfile(userId);
  const update = useUpdateDailyTargets(userId);
  const updateProfile = useUpdateProfile(userId);
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
      });
    }
  }, [targets, reset]);

  const completeProfile: CompleteProfile | null =
    profile?.weight_kg && profile?.height_cm && profile?.sex && profile?.birth_date
      ? (profile as CompleteProfile)
      : null;

  async function handleCalculate(goal: GoalPlan, pace: number | null) {
    if (!completeProfile) return;
    await updateProfile.mutateAsync({ goal, goal_pace_kg_per_week: pace });

    const recommended = calculateRecommendedTargets({
      weightKg: completeProfile.weight_kg,
      heightCm: completeProfile.height_cm,
      age: calculateAge(completeProfile.birth_date, todayISO()),
      sex: completeProfile.sex,
      activityLevel: (completeProfile.activity_level as ActivityLevel) ?? "light",
      goal,
      paceKgPerWeek: pace ?? undefined,
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
        <p className="mb-2 text-sm font-medium text-foreground">Doel &amp; tempo</p>
        {!completeProfile ? (
          <p className="text-xs text-muted-foreground">
            Vul hierboven eerst gewicht, lengte, geslacht en geboortedatum in om je voedingsschema automatisch te
            laten berekenen (Mifflin-St Jeor).
          </p>
        ) : (
          <GoalPaceEditor profile={completeProfile} onCalculate={handleCalculate} />
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Vult alle velden hieronder in — controleer en pas aan waar nodig, en klik daarna op Opslaan.
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

        <Button type="submit" disabled={isSubmitting || !isDirty} fullWidth>
          {isSubmitting ? "Opslaan…" : "Opslaan"}
        </Button>
      </form>
    </div>
  );
}
