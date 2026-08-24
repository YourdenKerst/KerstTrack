"use client";

import { useEffect } from "react";
import { GENERIC_REMINDER_TIMES, getReminderSettings, subscribeToReminderSettings } from "@/lib/notifications";
import { todayISO } from "@/lib/date";
import { useSupplementLogsForDate } from "@/lib/queries/supplementLogs";
import { useSupplements } from "@/lib/queries/supplements";
import type { Supplement } from "@/lib/types";
import { useUserId } from "@/lib/user-context";

function msUntil(timeHHmm: string): number | null {
  const [h, m] = timeHHmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  const diff = target.getTime() - now.getTime();
  return diff > 0 ? diff : null;
}

async function showReminder(supplement: Supplement) {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  registration.showNotification("Supplement-herinnering", {
    body: `Nog niet afgevinkt: ${supplement.name} (${supplement.dose_label}).`,
    icon: "/icons/icon-192.png",
    tag: `supplement-${supplement.id}`,
  });
}

/**
 * Best-effort lokale herinneringen — geen server-push. Werkt alleen zolang
 * de app (tab of geïnstalleerde PWA) open/geladen is. Zie de toelichting bij
 * de instelling in Settings.
 *
 * Per supplement: een eigen `reminder_time` geeft één melding op dat exacte
 * tijdstip; zonder tijdstip valt het terug op drie vaste algemene momenten.
 * Al afgevinkte supplementen worden overgeslagen (en de planning herrekent
 * zodra dat verandert, via de query-afhankelijkheid op `todayLogs`).
 */
export function SupplementReminders() {
  const userId = useUserId();
  const today = todayISO();
  const { data: supplements } = useSupplements(userId);
  const { data: todayLogs } = useSupplementLogsForDate(userId, today);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (!supplements) return;

    let timers: number[] = [];

    function schedule() {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];

      const settings = getReminderSettings();
      if (!settings.enabled || Notification.permission !== "granted") return;

      const checkedIds = new Set((todayLogs ?? []).map((log) => log.supplement_id));

      for (const supplement of supplements ?? []) {
        if (checkedIds.has(supplement.id)) continue;

        const times: readonly string[] = supplement.reminder_time
          ? [supplement.reminder_time.slice(0, 5)]
          : GENERIC_REMINDER_TIMES;

        for (const time of times) {
          const ms = msUntil(time);
          if (ms === null) continue;
          timers.push(window.setTimeout(() => showReminder(supplement), ms));
        }
      }
    }

    schedule();
    const unsubscribe = subscribeToReminderSettings(schedule);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      unsubscribe();
    };
  }, [supplements, todayLogs]);

  return null;
}
