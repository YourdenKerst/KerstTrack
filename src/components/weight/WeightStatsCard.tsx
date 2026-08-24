import { clsx } from "clsx";
import { Card } from "@/components/ui";
import { assessWeeklyRate, weeklyRateFromLogs } from "@/lib/calculations/weightTrend";
import type { WeightLog } from "@/lib/types";

const MESSAGES: Record<ReturnType<typeof assessWeeklyRate>, { text: string; tone: "good" | "neutral" | "warn" }> = {
  on_track: { text: "Mooi op schema voor het verwachte 0,5–0,7 kg/week.", tone: "good" },
  slower: { text: "Iets langzamer dan de verwachte 0,5–0,7 kg/week — dat is prima, ieder lichaam is anders.", tone: "neutral" },
  faster: { text: "Sneller dan de verwachte 0,5–0,7 kg/week — hou in de gaten dat dit gezond blijft.", tone: "warn" },
  gaining: { text: "Lichte stijging deze periode — geen paniek, bekijk het over een langere periode.", tone: "warn" },
  insufficient_data: { text: "Log een paar keer je gewicht om een trend te zien.", tone: "neutral" },
};

export function WeightStatsCard({ logs }: { logs: WeightLog[] }) {
  const rate = weeklyRateFromLogs(logs);
  const assessment = assessWeeklyRate(rate);
  const message = MESSAGES[assessment];

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-foreground">Gemiddeld per week</h2>
      {rate !== null ? (
        <p className="text-2xl font-semibold text-foreground">
          {rate > 0 ? "+" : ""}
          {rate.toFixed(2)} kg
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Nog niet genoeg data</p>
      )}
      <p
        className={clsx(
          "mt-1 text-xs",
          message.tone === "good" && "text-success",
          message.tone === "warn" && "text-warning",
          message.tone === "neutral" && "text-muted-foreground",
        )}
      >
        {message.text}
      </p>
    </Card>
  );
}
