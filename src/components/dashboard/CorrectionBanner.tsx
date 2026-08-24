"use client";

import { AlertTriangle } from "lucide-react";
import { relativeDayLabel } from "@/components/dashboard/DaySwitcher";
import { Card, CheckRow } from "@/components/ui";
import { todayISO } from "@/lib/date";
import { useCorrectionCheckoffsForDate, useToggleCorrectionCheckoff } from "@/lib/queries/correctionCheckoffs";
import type { TaskKey } from "@/lib/types";

const TASKS: { key: TaskKey; label: string; sublabel: string }[] = [
  { key: "extra_water", label: "Extra 0,5 l water", sublabel: "Boven op je normale doel — al verrekend hierboven" },
  {
    key: "extra_magnesium_food",
    label: "Extra magnesiumrijke voeding",
    sublabel: "Pompoenpitten, spinazie, bonen, amandelen",
  },
  { key: "extra_b_complex", label: "Extra B-complex tablet", sublabel: "Los van je vaste ochtend-supplement" },
];

export function CorrectionBanner({ userId, dateISO }: { userId: string; dateISO: string }) {
  const { data: checkoffs } = useCorrectionCheckoffsForDate(userId, dateISO);
  const toggle = useToggleCorrectionCheckoff(userId);
  const checkedKeys = new Set((checkoffs ?? []).map((c) => c.task_key));
  const label = relativeDayLabel(dateISO, todayISO());

  return (
    <Card className="border-warning/30" style={{ backgroundColor: "var(--warning-bg)" }}>
      <div className="mb-1 flex items-center gap-2">
        <AlertTriangle size={18} className="text-warning" />
        <h2 className="text-sm font-semibold text-foreground">Weekendcorrectie</h2>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">
        Er is de dag ervoor alcohol gelogd — hier is de correctie-checklist voor{" "}
        {label === "Vandaag" ? "vandaag" : label.toLowerCase()}.
      </p>
      <div className="divide-y divide-warning/20">
        {TASKS.map((task) => {
          const checked = checkedKeys.has(task.key);
          return (
            <CheckRow
              key={task.key}
              label={task.label}
              sublabel={task.sublabel}
              checked={checked}
              onToggle={() => toggle.mutate({ logDate: dateISO, taskKey: task.key, checked: !checked })}
              disabled={toggle.isPending}
            />
          );
        })}
      </div>
    </Card>
  );
}
