import { clsx } from "clsx";
import { buildAlcoholCalendar, computeAlcoholCorrelation } from "@/lib/calculations/alcoholCorrelation";
import { groupDatesIntoWeeks } from "@/lib/calculations/calendarGrid";
import { formatShortDate } from "@/lib/date";
import type { AlcoholLog, WeightLog } from "@/lib/types";

function DeltaValue({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <p className="text-sm text-muted-foreground">Niet genoeg data</p>;
  }
  return (
    <p className={clsx("text-xl font-semibold", delta < 0 ? "text-success" : delta > 0 ? "text-danger" : "text-foreground")}>
      {delta > 0 ? "+" : ""}
      {delta.toFixed(2)} kg
    </p>
  );
}

export function AlcoholCorrelationCards({
  weightLogs,
  alcoholLogs,
  startISO,
  endISO,
}: {
  weightLogs: WeightLog[];
  alcoholLogs: AlcoholLog[];
  startISO: string;
  endISO: string;
}) {
  const result = computeAlcoholCorrelation(weightLogs, alcoholLogs);
  const calendarDays = buildAlcoholCalendar(alcoholLogs, startISO, endISO);
  const weeks = groupDatesIntoWeeks(calendarDays);

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-foreground">Welke dagen alcohol gelogd is</p>
      <div className="mb-1 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-border" style={{ backgroundColor: "var(--warning-cell)" }} />
          Alcohol
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-border bg-surface-muted" />
          Geen alcohol
        </span>
      </div>
      <div className="flex gap-[3px] overflow-x-auto pb-3">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-[3px]">
            {week.map((day, dayIndex) =>
              day ? (
                <div
                  key={day.date}
                  title={`${formatShortDate(day.date)} — ${day.hadAlcohol ? "alcohol gelogd" : "geen alcohol"}`}
                  className={clsx("h-[11px] w-[11px] rounded-sm border border-border", !day.hadAlcohol && "bg-surface-muted")}
                  style={day.hadAlcohol ? { backgroundColor: "var(--warning-cell)" } : undefined}
                />
              ) : (
                <div key={dayIndex} className="h-[11px] w-[11px]" />
              ),
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Weken met veel alcohol (≥2 dagen)</p>
          <DeltaValue delta={result.highAlcoholAvgDelta} />
          <p className="mt-0.5 text-[11px] text-muted-foreground">n = {result.highAlcoholWeeks} weken</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Weken met weinig/geen alcohol</p>
          <DeltaValue delta={result.lowAlcoholAvgDelta} />
          <p className="mt-0.5 text-[11px] text-muted-foreground">n = {result.lowAlcoholWeeks} weken</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Gemiddelde gewichtsverandering binnen die week, op basis van je eigen logs. Puur beschrijvend — geen medisch
        advies.
      </p>
    </div>
  );
}
