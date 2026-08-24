"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button, Card, FieldError, Input, Label, Select } from "@/components/ui";
import { MICRONUTRIENT_META } from "@/lib/constants";
import {
  useAddSupplement,
  useAllSupplements,
  useDeactivateSupplement,
  useDeleteSupplementPermanently,
  useUpdateSupplement,
} from "@/lib/queries/supplements";
import type { MicronutrientKey, Supplement } from "@/lib/types";

const setValueAsNullableText = (raw: string) => (raw === "" ? null : raw);
const setValueAsNullableNumber = (raw: string) => (raw === "" ? null : Number(raw));

const schema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  dose_label: z.string().min(1, "Dosis is verplicht"),
  reminder_time: z.string().nullable(),
  linked_nutrient_key: z.string().nullable(),
  linked_nutrient_amount: z.number({ error: "Vul een getal in" }).nonnegative().nullable(),
});

type FormValues = z.infer<typeof schema>;

function nutrientLabel(key: string | null) {
  return MICRONUTRIENT_META.find((m) => m.key === key)?.label;
}

function nutrientUnit(key: string | null) {
  return MICRONUTRIENT_META.find((m) => m.key === key)?.unit ?? "";
}

function SupplementFields({
  register,
  errors,
  watchedLinkedKey,
}: {
  register: ReturnType<typeof useForm<FormValues>>["register"];
  errors: ReturnType<typeof useForm<FormValues>>["formState"]["errors"];
  watchedLinkedKey: string | null;
}) {
  return (
    <>
      <div>
        <Label>Naam</Label>
        <Input placeholder="Bijv. Omega-3" {...register("name")} />
        <FieldError>{errors.name?.message}</FieldError>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Dosis</Label>
          <Input placeholder="Bijv. 1000 mg" {...register("dose_label")} />
          <FieldError>{errors.dose_label?.message}</FieldError>
        </div>
        <div>
          <Label>Tijdstip (optioneel)</Label>
          <Input type="time" {...register("reminder_time", { setValueAs: setValueAsNullableText })} />
        </div>
      </div>
      <div>
        <Label>Koppelen aan voedingsstof (optioneel)</Label>
        <Select {...register("linked_nutrient_key", { setValueAs: setValueAsNullableText })}>
          <option value="">Geen koppeling</option>
          {MICRONUTRIENT_META.map((meta) => (
            <option key={meta.key} value={meta.key}>
              {meta.label}
            </option>
          ))}
        </Select>
      </div>
      {watchedLinkedKey && (
        <div>
          <Label>Hoeveelheid per dosis ({nutrientUnit(watchedLinkedKey)})</Label>
          <Input
            type="number"
            step="any"
            min={0}
            {...register("linked_nutrient_amount", { setValueAs: setValueAsNullableNumber })}
          />
          <FieldError>{errors.linked_nutrient_amount?.message}</FieldError>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Vul de hoeveelheid al om in {nutrientUnit(watchedLinkedKey)} — afvinken telt dit mee bij je dagtotaal.
          </p>
        </div>
      )}
    </>
  );
}

function SupplementRow({ userId, supplement }: { userId: string; supplement: Supplement }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateSupplement(userId);
  const deactivate = useDeactivateSupplement(userId);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: supplement.name,
      dose_label: supplement.dose_label,
      reminder_time: supplement.reminder_time,
      linked_nutrient_key: supplement.linked_nutrient_key,
      linked_nutrient_amount: supplement.linked_nutrient_amount,
    },
  });
  const watchedLinkedKey = useWatch({ control, name: "linked_nutrient_key" });

  async function onSubmit(values: FormValues) {
    await update.mutateAsync({ id: supplement.id, ...values, linked_nutrient_key: values.linked_nutrient_key as MicronutrientKey | null });
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 border-b border-border py-3" noValidate>
        <SupplementFields register={register} errors={errors} watchedLinkedKey={watchedLinkedKey} />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isSubmitting}>
            Opslaan
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Annuleren
          </Button>
        </div>
      </form>
    );
  }

  const linkedLabel = nutrientLabel(supplement.linked_nutrient_key);

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{supplement.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {supplement.reminder_time ? supplement.reminder_time.slice(0, 5) : "Geen vast tijdstip"} ·{" "}
          {supplement.dose_label}
          {linkedLabel && ` · +${supplement.linked_nutrient_amount ?? 0}${nutrientUnit(supplement.linked_nutrient_key)} ${linkedLabel}`}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Bewerk ${supplement.name}`}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={() => deactivate.mutate(supplement.id)}
          aria-label={`Verwijder ${supplement.name}`}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-danger"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function SupplementManager({ userId }: { userId: string }) {
  const { data: supplements } = useAllSupplements(userId);
  const addSupplement = useAddSupplement(userId);
  const update = useUpdateSupplement(userId);
  const hardDelete = useDeleteSupplementPermanently(userId);
  const [showAddForm, setShowAddForm] = useState(false);

  const active = (supplements ?? []).filter((s) => s.is_active);
  const inactive = (supplements ?? []).filter((s) => !s.is_active);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", dose_label: "", reminder_time: null, linked_nutrient_key: null, linked_nutrient_amount: null },
  });
  const watchedLinkedKey = useWatch({ control, name: "linked_nutrient_key" });

  async function onSubmit(values: FormValues) {
    await addSupplement.mutateAsync({
      ...values,
      linked_nutrient_key: values.linked_nutrient_key as MicronutrientKey | null,
      timing_label: null,
      sort_order: active.length,
    });
    reset();
    setShowAddForm(false);
  }

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-foreground">Schema beheren</h2>
      <div>
        {active.map((s) => (
          <SupplementRow key={s.id} userId={userId} supplement={s} />
        ))}
        {active.length === 0 && <p className="py-2 text-sm text-muted-foreground">Nog geen supplementen.</p>}
      </div>

      {inactive.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground">{inactive.length} niet-actief</summary>
          <div className="mt-2 space-y-2">
            {inactive.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-muted-foreground line-through">{s.name}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => update.mutate({ id: s.id, is_active: true })}
                    className="flex items-center gap-1 text-xs font-medium text-primary"
                  >
                    <RotateCcw size={12} /> Herstellen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`"${s.name}" definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
                        hardDelete.mutate(s.id);
                      }
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-danger"
                  >
                    <Trash2 size={12} /> Verwijderen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {showAddForm ? (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-2 border-t border-border pt-3" noValidate>
          <SupplementFields register={register} errors={errors} watchedLinkedKey={watchedLinkedKey} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              Toevoegen
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              Annuleren
            </Button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus size={16} /> Supplement toevoegen
        </button>
      )}
    </Card>
  );
}
