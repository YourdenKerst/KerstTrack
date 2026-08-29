"use client";

import { format } from "date-fns";
import { relativeDayLabel } from "@/components/dashboard/DaySwitcher";
import { Card, CheckRow } from "@/components/ui";
import { todayISO } from "@/lib/date";
import { useSupplements } from "@/lib/queries/supplements";
import { useSupplementLogsForDate, useToggleSupplementLog } from "@/lib/queries/supplementLogs";

export function SupplementChecklist({ userId, dateISO }: { userId: string; dateISO: string }) {
  const { data: supplements } = useSupplements(userId);
  const { data: logs } = useSupplementLogsForDate(userId, dateISO);
  const toggle = useToggleSupplementLog(userId);

  const logBySupplementId = new Map((logs ?? []).map((l) => [l.supplement_id, l]));
  const label = relativeDayLabel(dateISO, todayISO());

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-foreground">
        {label === "Vandaag" ? "Supplementen vandaag" : `Supplementen — ${label}`}
      </h2>
      <div className="divide-y divide-border">
        {(supplements ?? []).map((s) => {
          const log = logBySupplementId.get(s.id);
          const checked = Boolean(log);
          return (
            <CheckRow
              key={s.id}
              label={s.name}
              sublabel={checked ? `Afgevinkt om ${format(new Date(log!.checked_at), "HH:mm")}` : undefined}
              checked={checked}
              onToggle={() => toggle.mutate({ supplementId: s.id, logDate: dateISO, checked: !checked })}
              disabled={toggle.isPending}
              color={s.color}
            />
          );
        })}
        {supplements?.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">
            Nog geen supplementen ingesteld. Voeg ze toe in Instellingen.
          </p>
        )}
      </div>
    </Card>
  );
}
