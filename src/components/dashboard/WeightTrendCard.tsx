"use client";

import { clsx } from "clsx";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { useRecentWeightLogs } from "@/lib/queries/weightLogs";

export function WeightTrendCard({ userId }: { userId: string }) {
  const { data: logs } = useRecentWeightLogs(userId, 2);

  const latest = logs?.[0];
  const previous = logs?.[1];
  const delta = latest && previous ? Math.round((latest.weight_kg - previous.weight_kg) * 10) / 10 : null;

  return (
    <Link href="/weight" className="block">
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Huidig gewicht</p>
          {latest ? (
            <p className="text-2xl font-semibold text-foreground">{latest.weight_kg} kg</p>
          ) : (
            <p className="text-sm text-muted-foreground">Nog geen log — tik om te starten</p>
          )}
        </div>
        {delta !== null && (
          <div
            className={clsx(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium",
              delta < 0 && "bg-success/10 text-success",
              delta > 0 && "bg-danger/10 text-danger",
              delta === 0 && "bg-surface-muted text-muted-foreground",
            )}
          >
            {delta < 0 && <TrendingDown size={16} />}
            {delta > 0 && <TrendingUp size={16} />}
            {delta === 0 && <Minus size={16} />}
            {Math.abs(delta).toFixed(1)} kg
          </div>
        )}
      </Card>
    </Link>
  );
}
