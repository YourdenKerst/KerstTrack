/** Groepeert dagen in kolommen van 7 (ma t/m zo), met padding zodat kolom 1 op maandag begint. */
export function groupDatesIntoWeeks<T extends { date: string }>(days: T[]): (T | null)[][] {
  if (days.length === 0) return [];

  const firstDate = new Date(`${days[0].date}T00:00:00`);
  const firstWeekday = (firstDate.getDay() + 6) % 7; // 0 = maandag .. 6 = zondag
  const padded: (T | null)[] = [...Array(firstWeekday).fill(null), ...days];

  const weeks: (T | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }
  return weeks;
}
