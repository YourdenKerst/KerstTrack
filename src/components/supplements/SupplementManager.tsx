"use client";

import { Ban, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import {
  useAddSupplement,
  useAllSupplements,
  useDeactivateSupplement,
  useDeleteSupplementPermanently,
  useUpdateSupplement,
} from "@/lib/queries/supplements";
import {
  useSetSupplementReminders,
  useSupplementReminders,
  type ReminderSlotInput,
} from "@/lib/queries/supplementReminders";
import type { RecurrenceType, Supplement } from "@/lib/types";

export const WEEKDAY_LABELS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

const EVERY_N_DAYS_OPTIONS = [2, 3, 4];
const OFFSET_OPTIONS = [-180, -120, -60, -30, -15, 0, 15, 30, 60, 120, 180];
// Vrij te kiezen kleur om supplementen te groeperen, bv. per innamemoment
// (ontbijt/lunch/diner) — puur visueel, geen vaste categorieën.
const COLOR_PRESETS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899"];

function offsetLabel(minutes: number): string {
  if (minutes === 0) return "Op het moment zelf";
  const abs = Math.abs(minutes);
  const magnitude = abs < 60 ? `${abs} minuten` : `${abs / 60} uur`;
  return minutes < 0 ? `${magnitude} ervoor` : `${magnitude} erna`;
}

function recurrenceLabel(
  supplement: Pick<Supplement, "recurrence_type" | "recurrence_n" | "recurrence_weekday">,
): string {
  if (supplement.recurrence_type === "daily") return "elke dag";
  if (supplement.recurrence_type === "every_n_days") return `elke ${supplement.recurrence_n ?? 2} dagen`;
  return WEEKDAY_LABELS[supplement.recurrence_weekday ?? 0].toLowerCase();
}

interface ScheduleState {
  color: string | null;
  intake_time: string;
  recurrence_type: RecurrenceType;
  recurrence_n: number | null;
  recurrence_weekday: number | null;
}

function emptySchedule(): ScheduleState {
  return { color: null, intake_time: "09:00", recurrence_type: "daily", recurrence_n: null, recurrence_weekday: null };
}

function emptySlot(slot: number): ReminderSlotInput {
  return { slot, offset_minutes: slot === 1 ? 0 : 60 };
}

function ColorPicker({ value, onChange }: { value: string | null; onChange: (color: string | null) => void }) {
  return (
    <div>
      <Label>Kleur (optioneel)</Label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Geen kleur"
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-muted-foreground"
          style={{ borderColor: value === null ? "var(--foreground)" : "var(--border)" }}
        >
          <Ban size={14} />
        </button>
        {COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={`Kleur ${color}`}
            className="h-8 w-8 rounded-full border-2"
            style={{ backgroundColor: color, borderColor: value === color ? "var(--foreground)" : "transparent" }}
          />
        ))}
      </div>
    </div>
  );
}

function IntakeScheduleFields({
  value,
  onChange,
}: {
  value: ScheduleState;
  onChange: (next: ScheduleState) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Tijdstip van inname</Label>
          <Input
            type="time"
            value={value.intake_time}
            onChange={(e) => onChange({ ...value, intake_time: e.target.value })}
          />
        </div>
        <div>
          <Label>Herhaling</Label>
          <Select
            value={value.recurrence_type}
            onChange={(e) => onChange({ ...value, recurrence_type: e.target.value as RecurrenceType })}
          >
            <option value="daily">Elke dag</option>
            <option value="every_n_days">Elke N dagen</option>
            <option value="weekly">Vaste dag per week</option>
          </Select>
        </div>
      </div>
      {value.recurrence_type === "every_n_days" && (
        <div>
          <Label>Elke hoeveel dagen?</Label>
          <Select
            value={String(value.recurrence_n ?? 2)}
            onChange={(e) => onChange({ ...value, recurrence_n: Number(e.target.value) })}
          >
            {EVERY_N_DAYS_OPTIONS.map((n) => (
              <option key={n} value={n}>
                Elke {n} dagen
              </option>
            ))}
          </Select>
        </div>
      )}
      {value.recurrence_type === "weekly" && (
        <div>
          <Label>Welke dag?</Label>
          <Select
            value={String(value.recurrence_weekday ?? 0)}
            onChange={(e) => onChange({ ...value, recurrence_weekday: Number(e.target.value) })}
          >
            {WEEKDAY_LABELS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      )}
      <ColorPicker value={value.color} onChange={(color) => onChange({ ...value, color })} />
    </div>
  );
}

function ReminderOffsetsEditor({
  slots,
  onChange,
}: {
  slots: ReminderSlotInput[];
  onChange: (slots: ReminderSlotInput[]) => void;
}) {
  function updateSlot(index: number, offset_minutes: number) {
    onChange(slots.map((s, i) => (i === index ? { ...s, offset_minutes } : s)));
  }

  function removeSlot(index: number) {
    onChange(slots.filter((_, i) => i !== index).map((s, i) => ({ ...s, slot: i + 1 })));
  }

  return (
    <div className="space-y-2">
      <Label>Herinneringen</Label>
      {slots.map((slot, index) => (
        <div key={index} className="flex items-center gap-2">
          <Select
            value={String(slot.offset_minutes)}
            onChange={(e) => updateSlot(index, Number(e.target.value))}
            className="flex-1"
          >
            {OFFSET_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {offsetLabel(minutes)}
              </option>
            ))}
          </Select>
          {index === 0 ? (
            <span className="w-7 shrink-0 text-center text-[10px] text-muted-foreground">verpl.</span>
          ) : (
            <button
              type="button"
              onClick={() => removeSlot(index)}
              aria-label="Verwijder deze herinnering"
              className="shrink-0 rounded-full p-2 text-muted-foreground active:bg-surface-muted active:text-danger"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      {slots.length < 3 && (
        <button
          type="button"
          onClick={() => onChange([...slots, emptySlot(slots.length + 1)])}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors active:border-primary active:text-primary"
        >
          <Plus size={14} /> Nog een herinnering toevoegen (optioneel)
        </button>
      )}
    </div>
  );
}

function SupplementRow({ userId, supplement }: { userId: string; supplement: Supplement }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateSupplement(userId);
  const deactivate = useDeactivateSupplement(userId);
  const setReminders = useSetSupplementReminders(userId);
  const { data: existingReminders } = useSupplementReminders(supplement.id);

  const [name, setName] = useState(supplement.name);
  const [dose, setDose] = useState<string | null>(supplement.dose);
  const [schedule, setSchedule] = useState<ScheduleState>(emptySchedule());
  const [slots, setSlots] = useState<ReminderSlotInput[]>([emptySlot(1)]);

  function startEditing() {
    setName(supplement.name);
    setDose(supplement.dose);
    setSchedule({
      color: supplement.color,
      intake_time: supplement.intake_time.slice(0, 5),
      recurrence_type: supplement.recurrence_type,
      recurrence_n: supplement.recurrence_n,
      recurrence_weekday: supplement.recurrence_weekday,
    });
    setSlots(
      existingReminders && existingReminders.length > 0
        ? existingReminders.map((r) => ({ slot: r.slot, offset_minutes: r.offset_minutes }))
        : [emptySlot(1)],
    );
    setEditing(true);
  }

  async function handleSave() {
    await update.mutateAsync({ id: supplement.id, name, dose, ...schedule });
    await setReminders.mutateAsync({ supplementId: supplement.id, slots });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-3 border-b border-border py-3">
        <div>
          <Label>Naam</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Hoeveelheid (optioneel)</Label>
          <Input
            placeholder="Bijv. 2 capsules of 500mg"
            value={dose ?? ""}
            onChange={(e) => setDose(e.target.value === "" ? null : e.target.value)}
          />
        </div>
        <IntakeScheduleFields value={schedule} onChange={setSchedule} />
        <ReminderOffsetsEditor slots={slots} onChange={setSlots} />
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={handleSave} disabled={!name.trim()}>
            Opslaan
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Annuleren
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-2.5 last:border-b-0">
      <button type="button" onClick={startEditing} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        {supplement.color && (
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: supplement.color }} />
        )}
        <span className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {supplement.name}
            {supplement.dose && <span className="font-normal text-muted-foreground"> · {supplement.dose}</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {supplement.intake_time.slice(0, 5)} · {recurrenceLabel(supplement)}
            {existingReminders && existingReminders.length > 0 && (
              <> · {existingReminders.map((r) => offsetLabel(r.offset_minutes)).join(" · ")}</>
            )}
          </p>
        </span>
      </button>
      <button
        type="button"
        onClick={() => deactivate.mutate(supplement.id)}
        aria-label={`Verwijder ${supplement.name}`}
        className="shrink-0 rounded-full p-2.5 text-muted-foreground transition-colors active:bg-surface-muted active:text-danger"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export function SupplementManager({ userId }: { userId: string }) {
  const { data: supplements } = useAllSupplements(userId);
  const update = useUpdateSupplement(userId);
  const addSupplement = useAddSupplement(userId);
  const setReminders = useSetSupplementReminders(userId);
  const hardDelete = useDeleteSupplementPermanently(userId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDose, setNewDose] = useState<string | null>(null);
  const [newSchedule, setNewSchedule] = useState<ScheduleState>(emptySchedule());
  const [newSlots, setNewSlots] = useState<ReminderSlotInput[]>([emptySlot(1)]);
  const [saving, setSaving] = useState(false);

  const active = (supplements ?? []).filter((s) => s.is_active);
  const inactive = (supplements ?? []).filter((s) => !s.is_active);

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const supplement = await addSupplement.mutateAsync({
        name: newName.trim(),
        dose: newDose,
        sort_order: active.length,
        ...newSchedule,
      });
      await setReminders.mutateAsync({ supplementId: supplement.id, slots: newSlots });
      setNewName("");
      setNewDose(null);
      setNewSchedule(emptySchedule());
      setNewSlots([emptySlot(1)]);
      setShowAddForm(false);
    } finally {
      setSaving(false);
    }
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
                    className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium text-primary active:bg-surface-muted"
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
                    className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium text-danger active:bg-surface-muted"
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
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div>
            <Label>Naam</Label>
            <Input placeholder="Bijv. Omega-3" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div>
            <Label>Hoeveelheid (optioneel)</Label>
            <Input
              placeholder="Bijv. 2 capsules of 500mg"
              value={newDose ?? ""}
              onChange={(e) => setNewDose(e.target.value === "" ? null : e.target.value)}
            />
          </div>
          <IntakeScheduleFields value={newSchedule} onChange={setNewSchedule} />
          <ReminderOffsetsEditor slots={newSlots} onChange={setNewSlots} />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleAdd} disabled={saving || !newName.trim()}>
              {saving ? "Toevoegen…" : "Toevoegen"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              Annuleren
            </Button>
          </div>
        </div>
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
