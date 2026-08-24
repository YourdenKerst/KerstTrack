"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { computeMacroAdherence } from "@/lib/calculations/adherence";
import type { DailyTargets, FoodLog } from "@/lib/types";

export function MacroAdherenceChart({ logs, targets }: { logs: FoodLog[]; targets: DailyTargets }) {
  const data = computeMacroAdherence(logs, targets);
  const hasData = data.some((d) => d.trackedDays > 0);

  if (!hasData) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nog geen voedingslogs in deze periode.</p>;
  }

  return (
    <div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: -24 }} barCategoryGap="24%">
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={34}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(value) => [`${value}% van de dagen op doel`, ""]}
              contentStyle={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Bar dataKey="onTargetPct" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
              <LabelList
                dataKey="onTargetPct"
                position="top"
                formatter={(v) => `${v}%`}
                style={{ fontSize: 11, fill: "var(--foreground)", fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-center text-[11px] text-muted-foreground">% van de gelogde dagen binnen ±10% van je doel</p>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground">Toon als tabel</summary>
        <div className="mt-2 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-2 py-1">Macro</th>
                <th className="px-2 py-1 text-right">Op doel</th>
                <th className="px-2 py-1 text-right">Gem. afwijking</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.key} className="border-b border-border last:border-b-0">
                  <td className="px-2 py-1 text-foreground">{d.label}</td>
                  <td className="px-2 py-1 text-right text-foreground">{d.onTargetPct}%</td>
                  <td className="px-2 py-1 text-right text-foreground">
                    {d.avgDeviationPct > 0 ? "+" : ""}
                    {d.avgDeviationPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
