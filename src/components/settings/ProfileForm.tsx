"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button, FieldError, Input, Label, Select } from "@/components/ui";
import { ACTIVITY_LEVELS, GOAL_PLANS, type GoalPlan } from "@/lib/calculations/recommendedTargets";
import { useProfile, useUpdateProfile } from "@/lib/queries/profiles";

const schema = z.object({
  display_name: z.string().max(60).nullable(),
  weight_kg: z.number({ error: "Vul een getal in" }).positive("Moet groter dan 0 zijn"),
  height_cm: z.number({ error: "Vul een getal in" }).positive("Moet groter dan 0 zijn"),
  sex: z.enum(["male", "female"]).nullable(),
  birth_date: z.string().nullable(),
  activity_level: z.string().nullable(),
  goal: z.enum(["afvallen", "onderhoud", "spieropbouw"]).nullable(),
  goal_pace_kg_per_week: z.number().nullable(),
});

type FormValues = z.infer<typeof schema>;

const setValueAsNullableText = (raw: string) => (raw === "" ? null : raw);

export function ProfileForm({ userId }: { userId: string }) {
  const { data: profile } = useProfile(userId);
  const update = useUpdateProfile(userId);
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const selectedGoal = useWatch({ control, name: "goal" });
  const pace = useWatch({ control, name: "goal_pace_kg_per_week" });
  const goalPlan = GOAL_PLANS.find((g) => g.key === selectedGoal);

  useEffect(() => {
    if (profile) {
      reset({
        display_name: profile.display_name,
        weight_kg: profile.weight_kg ?? 0,
        height_cm: profile.height_cm ?? 0,
        sex: profile.sex,
        birth_date: profile.birth_date,
        activity_level: profile.activity_level,
        goal: (profile.goal as GoalPlan | null) ?? null,
        goal_pace_kg_per_week: profile.goal_pace_kg_per_week,
      });
    }
  }, [profile, reset]);

  function handleGoalChange(value: string) {
    const nextGoal = (value || null) as GoalPlan | null;
    setValue("goal", nextGoal, { shouldDirty: true });
    const nextPlan = GOAL_PLANS.find((g) => g.key === nextGoal);
    setValue("goal_pace_kg_per_week", nextPlan?.paceRange?.default ?? null, { shouldDirty: true });
  }

  async function onSubmit(values: FormValues) {
    await update.mutateAsync(values);
    reset(values);
  }

  if (!profile) return <p className="text-sm text-muted-foreground">Laden…</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <p className="text-xs text-muted-foreground">
        Voor de begroeting op het dashboard en voor de aanbevolen-doelen-rekenmachine hieronder. Je dagelijkse
        gewicht log je via het Gewicht-tabblad.
      </p>

      <div>
        <Label htmlFor="display_name">Naam</Label>
        <Input
          id="display_name"
          placeholder="Hoe je begroet wil worden"
          {...register("display_name", { setValueAs: setValueAsNullableText })}
        />
        <FieldError>{errors.display_name?.message}</FieldError>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="weight_kg">Gewicht (kg)</Label>
          <Input id="weight_kg" type="number" step="any" {...register("weight_kg", { valueAsNumber: true })} />
          <FieldError>{errors.weight_kg?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="height_cm">Lengte (cm)</Label>
          <Input id="height_cm" type="number" step="any" {...register("height_cm", { valueAsNumber: true })} />
          <FieldError>{errors.height_cm?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="sex">Geslacht</Label>
          <Select id="sex" {...register("sex", { setValueAs: setValueAsNullableText })}>
            <option value="">Niet ingevuld</option>
            <option value="male">Man</option>
            <option value="female">Vrouw</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="birth_date">Geboortedatum</Label>
          <Input
            id="birth_date"
            type="date"
            {...register("birth_date", { setValueAs: setValueAsNullableText })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="activity_level">Activiteitsniveau</Label>
        <Select id="activity_level" {...register("activity_level", { setValueAs: setValueAsNullableText })}>
          <option value="">Niet ingevuld</option>
          {ACTIVITY_LEVELS.map((level) => (
            <option key={level.key} value={level.key}>
              {level.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="goal">Doel</Label>
        <Select id="goal" value={selectedGoal ?? ""} onChange={(e) => handleGoalChange(e.target.value)}>
          <option value="">Niet ingevuld</option>
          {GOAL_PLANS.map((plan) => (
            <option key={plan.key} value={plan.key}>
              {plan.label}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Bepaalt de formule waarmee je dagdoelen worden berekend (zie Dagdoelen hieronder).
        </p>
      </div>

      {goalPlan?.paceRange && (
        <div>
          <Label htmlFor="goal_pace_kg_per_week">
            Tempo: {(pace ?? goalPlan.paceRange.default).toFixed(2)} kg per week{" "}
            {goalPlan.direction < 0 ? "verliezen" : "erbij"}
          </Label>
          <input
            id="goal_pace_kg_per_week"
            type="range"
            min={goalPlan.paceRange.min}
            max={goalPlan.paceRange.max}
            step={goalPlan.paceRange.step}
            value={pace ?? goalPlan.paceRange.default}
            onChange={(e) => setValue("goal_pace_kg_per_week", Number(e.target.value), { shouldDirty: true })}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Rustig ({goalPlan.paceRange.min} kg/week)</span>
            <span>Snel ({goalPlan.paceRange.max} kg/week)</span>
          </div>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting || !isDirty} fullWidth>
        {isSubmitting ? "Opslaan…" : "Opslaan"}
      </Button>
    </form>
  );
}
