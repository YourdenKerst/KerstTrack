"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, FieldError, Input, Label } from "@/components/ui";
import { todayISO } from "@/lib/date";
import { useUpsertWeightLog } from "@/lib/queries/weightLogs";

const schema = z.object({
  log_date: z.string().min(1, "Datum is verplicht"),
  weight_kg: z.number({ error: "Vul een getal in" }).positive("Moet groter dan 0 zijn"),
});

type FormValues = z.infer<typeof schema>;

export function WeightLogForm({ userId }: { userId: string }) {
  const upsert = useUpsertWeightLog(userId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { log_date: todayISO() },
  });

  async function onSubmit(values: FormValues) {
    await upsert.mutateAsync({ weightKg: values.weight_kg, logDate: values.log_date });
    reset({ log_date: todayISO(), weight_kg: undefined });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-start gap-2" noValidate>
      <div className="flex-1">
        <Label htmlFor="weight_kg">Gewicht (kg)</Label>
        <Input
          id="weight_kg"
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          placeholder="bijv. 100,8"
          {...register("weight_kg", { valueAsNumber: true })}
        />
        <FieldError>{errors.weight_kg?.message}</FieldError>
      </div>
      <div className="flex-1">
        <Label htmlFor="log_date">Datum</Label>
        <Input id="log_date" type="date" max={todayISO()} {...register("log_date")} />
        <FieldError>{errors.log_date?.message}</FieldError>
      </div>
      <Button type="submit" disabled={isSubmitting} className="mt-6">
        Opslaan
      </Button>
    </form>
  );
}
