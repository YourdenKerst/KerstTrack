import { differenceInCalendarDays } from "date-fns";
import type { Supplement } from "@/lib/types";

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
 * inname minus het aantal minuten vooraf, binnen dezelfde dag gewrapt (een
 * herinnering vlak na midnight vóór een vroege inname telt als "vandaag").
 */
export function computeReminderClockTime(intakeTime: string, minutesBefore: number): string {
  const [h, m] = intakeTime.split(":").map(Number);
  const totalMinutes = (((h * 60 + m - minutesBefore) % 1440) + 1440) % 1440;
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
