import { differenceInCalendarDays } from "date-fns";
import type { Supplement, SupplementReminder } from "@/lib/types";

/**
 * Of een supplement vandaag aan de beurt is, op basis van het herhaalpatroon.
 * "Elke N dagen" telt vanaf een vaste ankerdatum (niet vanaf het aanmaken van het
 * supplement) — dat geeft een stabiel, voorspelbaar patroon zonder dat er een
 * startdatum ingesteld hoeft te worden.
 */
export function isSupplementDueOnDate(
  supplement: Pick<Supplement, "recurrence_type" | "recurrence_n" | "recurrence_weekday">,
  dateISO: string,
): boolean {
  const date = new Date(`${dateISO}T00:00:00`);

  if (supplement.recurrence_type === "daily") return true;

  if (supplement.recurrence_type === "weekly") {
    const jsWeekday = date.getDay(); // 0 = zondag ... 6 = zaterdag
    const weekday = (jsWeekday + 6) % 7; // 0 = maandag ... 6 = zondag
    return weekday === supplement.recurrence_weekday;
  }

  const n = supplement.recurrence_n ?? 2;
  const daysSinceEpoch = differenceInCalendarDays(date, new Date(0));
  return daysSinceEpoch % n === 0;
}

/**
 * Het kloktijdstip (HH:mm) waarop een herinnering moet afgaan: het tijdstip van
 * inname plus een (mogelijk negatief) aantal minuten offset — negatief = ervoor,
 * positief = erna, 0 = op het moment zelf — binnen dezelfde dag gewrapt (een
 * herinnering vlak na midnight vóór een vroege inname telt als "vandaag").
 */
export function computeReminderClockTime(intakeTime: string, offsetMinutes: number): string {
  const [h, m] = intakeTime.split(":").map(Number);
  const totalMinutes = (((h * 60 + m + offsetMinutes) % 1440) + 1440) % 1440;
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export interface TodaysReminderEntry {
  supplementId: string;
  supplementName: string;
  clockTime: string;
  isPast: boolean;
}

/**
 * Alle herinneringsmomenten van vandaag voor nog-niet-afgevinkte supplementen
 * die vandaag aan de beurt zijn — inclusief al-gepasseerde momenten (met
 * `isPast`), zodat dit ook dient als zichtbare diagnose: als hier niets
 * "nog te gaan" staat, is er vandaag terecht (nog) geen melding gepland.
 */
export function computeTodaysReminders(
  supplements: Pick<Supplement, "id" | "name" | "recurrence_type" | "recurrence_n" | "recurrence_weekday" | "intake_time">[],
  reminders: Pick<SupplementReminder, "supplement_id" | "offset_minutes">[],
  checkedSupplementIds: Set<string>,
  todayISO: string,
  nowClockTime: string,
): TodaysReminderEntry[] {
  const entries: TodaysReminderEntry[] = [];
  for (const supplement of supplements) {
    if (checkedSupplementIds.has(supplement.id)) continue;
    if (!isSupplementDueOnDate(supplement, todayISO)) continue;
    for (const reminder of reminders.filter((r) => r.supplement_id === supplement.id)) {
      const clockTime = computeReminderClockTime(supplement.intake_time.slice(0, 5), reminder.offset_minutes);
      entries.push({
        supplementId: supplement.id,
        supplementName: supplement.name,
        clockTime,
        isPast: clockTime <= nowClockTime,
      });
    }
  }
  return entries.sort((a, b) => a.clockTime.localeCompare(b.clockTime));
}
