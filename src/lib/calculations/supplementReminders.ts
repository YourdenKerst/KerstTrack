import { differenceInCalendarDays } from "date-fns";
import type { SupplementReminder } from "@/lib/types";

/**
 * Of een meldingsmoment vandaag aan de beurt is, op basis van het herhaalpatroon.
 * "Elke N dagen" telt vanaf een vaste ankerdatum (niet vanaf het aanmaken van het
 * supplement) — dat geeft een stabiel, voorspelbaar patroon zonder dat er een
 * startdatum ingesteld hoeft te worden.
 */
export function isReminderDueOnDate(
  reminder: Pick<SupplementReminder, "recurrence_type" | "recurrence_n" | "recurrence_weekday">,
  dateISO: string,
): boolean {
  const date = new Date(`${dateISO}T00:00:00`);

  if (reminder.recurrence_type === "daily") return true;

  if (reminder.recurrence_type === "weekly") {
    const jsWeekday = date.getDay(); // 0 = zondag ... 6 = zaterdag
    const weekday = (jsWeekday + 6) % 7; // 0 = maandag ... 6 = zondag
    return weekday === reminder.recurrence_weekday;
  }

  const n = reminder.recurrence_n ?? 2;
  const daysSinceEpoch = differenceInCalendarDays(date, new Date(0));
  return daysSinceEpoch % n === 0;
}
