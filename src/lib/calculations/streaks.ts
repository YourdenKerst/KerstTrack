import { addDaysISO, todayISO } from "@/lib/date";
import type { SupplementLog } from "@/lib/types";

/**
 * Lengte van de lopende reeks opeenvolgende dagen dat dit supplement is afgevinkt.
 * Als vandaag nog niet is afgevinkt telt de dag nog als "open" (nog niet gebroken);
 * de telling begint dan bij gisteren.
 */
export function calculateStreak(logs: SupplementLog[], supplementId: string): number {
  const checkedDates = new Set(logs.filter((l) => l.supplement_id === supplementId).map((l) => l.log_date));

  let streak = 0;
  let cursor = todayISO();
  if (!checkedDates.has(cursor)) {
    cursor = addDaysISO(cursor, -1);
  }
  while (checkedDates.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}
