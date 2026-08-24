"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { computeWaterAdherence } from "@/lib/calculations/waterAdherence";
import { formatShortDate } from "@/lib/date";
import type { AlcoholLog, DailyTargets, WaterLog } from "@/lib/types";

export function WaterAdherenceChart({
  waterLogs,
  alcoholLogs,
  targets,
  startISO,
  endISO,
}: {
  waterLogs: WaterLog[];
  alcoholLogs: AlcoholLog[];
  targets: DailyTargets;
  startISO: string;
  endISO: string;
}) {
  const data = computeWaterAdherence(waterLogs, alcoholLogs, targets, startISO, endISO);
  const hasData = data.some((d) => d.totalMl > 0);

  if (!hasData) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nog geen waterlogs in deze periode.</p>;
  }

  return (
    <div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => formatShortDate(value)}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={38}
              tickFormatter={(v) => `${v}%`}
            />
            <ReferenceLine y={100} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
            <Tooltip
              labelFormatter={(value) => formatShortDate(String(value))}
              formatter={(value, _name, item) => [
                `${value}% (${item?.payload?.totalMl ?? 0} / ${item?.payload?.targetMl ?? 0} ml)`,
                "Waterdoel",
              ]}
              contentStyle={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="pct"
              name="pct"
              stroke="var(--macro-water)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-center text-[11px] text-muted-foreground">% van je (voor alcohol gecorrigeerde) waterdoel — stippellijn = 100%</p>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground">Toon als tabel</summary>
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-2 py-1">Datum</th>
                <th className="px-2 py-1 text-right">Water</th>
                <th className="px-2 py-1 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((point) => (
                <tr key={point.date} className="border-b border-border last:border-b-0">
                  <td className="px-2 py-1 text-foreground">{formatShortDate(point.date)}</td>
                  <td className="px-2 py-1 text-right text-foreground">
                    {point.totalMl} / {point.targetMl} ml
                  </td>
                  <td className="px-2 py-1 text-right text-foreground">{point.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
