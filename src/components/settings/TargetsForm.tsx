"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Card, FieldError, Input, Label, Select } from "@/components/ui";
import {
  ACTIVITY_LEVELS,
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
});

type FormValues = z.infer<typeof schema>;

interface CompleteProfile extends Profile {
  weight_kg: number;
  height_cm: number;
  sex: NonNullable<Profile["sex"]>;
  birth_date: string;
}

interface NutritionSchedule {
  activityLevel: ActivityLevel | null;
  goal: GoalPlan | null;
  pace: number | null;
}

/**
 * Voedingsschema-blok + de trigger voor "Dagelijkse doelen" hieronder. Mount
 * alleen zodra het profiel compleet is, zodat activityLevel/goal/pace veilig
 * lazy vanuit `profile` geïnitialiseerd kunnen worden (geen effect nodig).
 */
function NutritionScheduleEditor({
  profile,
  onCalculate,
  children,
}: {
  profile: CompleteProfile;
  onCalculate: (schedule: NutritionSchedule) => Promise<void>;
  children: ReactNode;
}) {
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(
    () => (profile.activity_level as ActivityLevel | null) ?? null,
  );
  const [goal, setGoal] = useState<GoalPlan | null>(() => (profile.goal as GoalPlan | null) ?? null);
  const [pace, setPace] = useState<number | null>(() => profile.goal_pace_kg_per_week);
  const [calculating, setCalculating] = useState(false);

  const goalPlan = GOAL_PLANS.find((g) => g.key === goal);
  const inDanger = Boolean(goalPlan?.paceRange && pace != null && pace > goalPlan.paceRange.dangerAbove);

  function handleGoalChange(raw: string) {
    const nextGoal = (raw || null) as GoalPlan | null;
    setGoal(nextGoal);
    const nextPlan = GOAL_PLANS.find((g) => g.key === nextGoal);
    setPace(nextPlan?.paceRange?.default ?? null);
  }

  async function handleCalculate() {
    if (!goal) return;
    setCalculating(true);
    try {
      await onCalculate({ activityLevel, goal, pace });
    } finally {
      setCalculating(false);
    }
  }

  return (
    <>
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Voedingsschema</h2>
        <div className="space-y-3">
          <div>
            <Label>Activiteitsniveau</Label>
            <Select value={activityLevel ?? ""} onChange={(e) => setActivityLevel((e.target.value || null) as ActivityLevel | null)}>
              <option value="">Niet ingevuld</option>
              {ACTIVITY_LEVELS.map((level) => (
                <option key={level.key} value={level.key}>
                  {level.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Doel</Label>
            <Select value={goal ?? ""} onChange={(e) => handleGoalChange(e.target.value)}>
              <option value="">Niet ingevuld</option>
              {GOAL_PLANS.map((plan) => (
                <option key={plan.key} value={plan.key}>
                  {plan.label}
                </option>
              ))}
            </Select>
          </div>

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
                  Dit tempo is agressiever dan doorgaans wordt aangeraden en kan gepaard gaan met meer
                  spierverlies, vermoeidheid of een groter risico op terugval. Overweeg een rustiger tempo, of
                  overleg dit met een arts of diëtist.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold text-foreground">Dagelijkse doelen</h2>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Vul de aanbevolen waarden in op basis van je voedingsschema hierboven, of pas de velden zelf aan.
        </p>
        <Button type="button" variant="secondary" fullWidth onClick={handleCalculate} disabled={calculating || !goal}>
          {calculating ? "Bezig…" : "Bereken en vul in"}
        </Button>
        <div className="mt-3">{children}</div>
      </Card>
    </>
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
      });
    }
  }, [targets, reset]);

  const completeProfile: CompleteProfile | null =
    profile?.weight_kg && profile?.height_cm && profile?.sex && profile?.birth_date
      ? (profile as CompleteProfile)
      : null;

  async function handleCalculate(schedule: NutritionSchedule) {
    if (!completeProfile || !schedule.goal) return;
    await updateProfile.mutateAsync({
      activity_level: schedule.activityLevel,
      goal: schedule.goal,
      goal_pace_kg_per_week: schedule.pace,
    });

    const recommended = calculateRecommendedTargets({
      weightKg: completeProfile.weight_kg,
      heightCm: completeProfile.height_cm,
      age: calculateAge(completeProfile.birth_date, todayISO()),
      sex: completeProfile.sex,
      activityLevel: schedule.activityLevel ?? "light",
      goal: schedule.goal,
      paceKgPerWeek: schedule.pace ?? undefined,
    });

    // keepDefaultValues: zonder deze optie behandelt reset() de zojuist
    // berekende waarden als de nieuwe "opgeslagen" staat, waardoor isDirty
    // meteen weer false wordt en de Opslaan-knop uitgeschakeld blijft — ook
    // al staat er niets van deze berekening in de database. Door de defaults
    // op de oude (wél opgeslagen) targets te laten staan, ziet react-hook-form
    // het verschil met de nieuwe waarden correct als een openstaande wijziging.
    reset(recommended, { keepDefaultValues: true });
  }

  async function onSubmit(values: FormValues) {
    await update.mutateAsync(values);
    reset(values);
  }

  if (!targets) return <p className="text-sm text-muted-foreground">Laden…</p>;

  const targetsFieldsForm = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="calories_kcal">Calorieën (kcal)</Label>
          <Input id="calories_kcal" type="number" step="any" {...register("calories_kcal", { valueAsNumber: true })} />
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

      <Button type="submit" disabled={isSubmitting || !isDirty} fullWidth>
        {isSubmitting ? "Opslaan…" : "Opslaan"}
      </Button>
    </form>
  );

  if (!completeProfile) {
    return (
      <div className="space-y-4">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Voedingsschema</h2>
          <p className="text-xs text-muted-foreground">
            Vul eerst gewicht, lengte, geslacht en geboortedatum in bij Profiel om je voedingsschema automatisch te
            laten berekenen (Mifflin-St Jeor).
          </p>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Dagelijkse doelen</h2>
          {targetsFieldsForm}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <NutritionScheduleEditor profile={completeProfile} onCalculate={handleCalculate}>
        {targetsFieldsForm}
      </NutritionScheduleEditor>
    </div>
  );
}
