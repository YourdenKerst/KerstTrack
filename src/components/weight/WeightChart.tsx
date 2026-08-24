"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildWeightChartData } from "@/lib/calculations/weightTrend";
import { formatShortDate } from "@/lib/date";
import type { WeightLog } from "@/lib/types";

export function WeightChart({ logs }: { logs: WeightLog[] }) {
  const data = buildWeightChartData(logs);

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nog geen gewichtslogs in deze periode.</p>;
  }

  const lastIndex = data.length - 1;

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: -20 }}>
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
              domain={["auto", "auto"]}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              labelFormatter={(value) => formatShortDate(String(value))}
              formatter={(value, name) => [`${value} kg`, name === "weight" ? "Gewicht" : "Trend"]}
              contentStyle={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--muted-foreground)" }}
            />
            <Line
              type="linear"
              dataKey="trend"
              name="trend"
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="weight"
              name="weight"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--primary)", strokeWidth: 2, stroke: "var(--surface)" }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
              connectNulls
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts' label-renderer prop type isn't practical to satisfy exactly
              label={(props: any) => {
                const { x, y, index, value } = props;
                if (index !== lastIndex || x === undefined || y === undefined || value === undefined) {
                  return <g key={index} />;
                }
                return (
                  <text
                    key={index}
                    x={x}
                    y={y}
                    dy={-12}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill="var(--foreground)"
                  >
                    {value} kg
                  </text>
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-center text-[11px] text-muted-foreground">— gemeten gewicht · - - trendlijn</p>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground">Toon als tabel</summary>
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-2 py-1">Datum</th>
                <th className="px-2 py-1 text-right">Gewicht</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((point) => (
                <tr key={point.date} className="border-b border-border last:border-b-0">
                  <td className="px-2 py-1 text-foreground">{formatShortDate(point.date)}</td>
                  <td className="px-2 py-1 text-right text-foreground">{point.weight} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
