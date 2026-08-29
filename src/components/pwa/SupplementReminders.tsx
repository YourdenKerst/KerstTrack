"use client";

import { useEffect } from "react";
import { getReminderSettings, subscribeToReminderSettings } from "@/lib/notifications";
import { computeReminderClockTime, isSupplementDueOnDate } from "@/lib/calculations/supplementReminders";
import { todayISO } from "@/lib/date";
import { useAllSupplementReminders } from "@/lib/queries/supplementReminders";
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
    body: `Nog niet afgevinkt: ${supplement.name}.`,
    icon: "/icons/icon-192.png",
    tag: `supplement-${supplement.id}`,
  });
}

/**
 * Best-effort lokale herinneringen — geen server-push. Werkt alleen zolang
 * de app (tab of geïnstalleerde PWA) open/geladen is. Zie de toelichting bij
 * de instelling in Settings.
 *
 * Elk supplement heeft één tijdstip van inname + herhaalpatroon, met tot 3
 * herinneringen die elk een aantal minuten vóór of ná dat tijdstip afgaan
 * (zie SupplementManager). Alleen supplementen die vandaag aan de beurt zijn
 * en nog niet zijn afgevinkt worden ingepland.
 */
export function SupplementReminders() {
  const userId = useUserId();
  const today = todayISO();
  const { data: supplements } = useSupplements(userId);
  const { data: reminders } = useAllSupplementReminders(userId);
  const { data: todayLogs } = useSupplementLogsForDate(userId, today);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (!supplements || !reminders) return;

    let timers: number[] = [];

    function schedule() {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];

      const settings = getReminderSettings();
      if (!settings.enabled || Notification.permission !== "granted") return;

      const checkedIds = new Set((todayLogs ?? []).map((log) => log.supplement_id));
      const supplementById = new Map((supplements ?? []).map((s) => [s.id, s]));

      for (const reminder of reminders ?? []) {
        const supplement = supplementById.get(reminder.supplement_id);
        if (!supplement || checkedIds.has(supplement.id)) continue;
        if (!isSupplementDueOnDate(supplement, today)) continue;

        const clockTime = computeReminderClockTime(supplement.intake_time.slice(0, 5), reminder.offset_minutes);
        const ms = msUntil(clockTime);
        if (ms === null) continue;
        timers.push(window.setTimeout(() => showReminder(supplement), ms));
      }
    }

    schedule();
    const unsubscribe = subscribeToReminderSettings(schedule);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      unsubscribe();
    };
  }, [supplements, reminders, todayLogs, today]);

  return null;
}
