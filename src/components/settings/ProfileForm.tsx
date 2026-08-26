"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, FieldError, Input, Label, Select } from "@/components/ui";
import { useProfile, useUpdateProfile } from "@/lib/queries/profiles";

const schema = z.object({
  display_name: z.string().max(60).nullable(),
  weight_kg: z.number({ error: "Vul een getal in" }).positive("Moet groter dan 0 zijn"),
  height_cm: z.number({ error: "Vul een getal in" }).positive("Moet groter dan 0 zijn"),
  sex: z.enum(["male", "female"]).nullable(),
  birth_date: z.string().nullable(),
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
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (profile) {
      reset({
        display_name: profile.display_name,
        weight_kg: profile.weight_kg ?? 0,
        height_cm: profile.height_cm ?? 0,
        sex: profile.sex,
        birth_date: profile.birth_date,
      });
    }
  }, [profile, reset]);

  async function onSubmit(values: FormValues) {
    await update.mutateAsync(values);
    reset(values);
  }

  if (!profile) return <p className="text-sm text-muted-foreground">Laden…</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <p className="text-xs text-muted-foreground">
        Voor de begroeting op het dashboard en voor je voedingsschema. Je dagelijkse gewicht log je via het
        gewicht-blok op het dashboard.
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

      <Button type="submit" disabled={isSubmitting || !isDirty} fullWidth>
        {isSubmitting ? "Opslaan…" : "Opslaan"}
      </Button>
    </form>
  );
}
