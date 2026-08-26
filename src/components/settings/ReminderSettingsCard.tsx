"use client";

import { Bell } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { Button, Card, Toggle } from "@/components/ui";
import { computeTodaysReminders } from "@/lib/calculations/supplementReminders";
import { todayISO } from "@/lib/date";
import {
  getNotificationPermission,
  getReminderSettings,
  getServerNotificationPermission,
  getServerReminderSettings,
  notifyReminderChange,
  setReminderSettings,
  subscribeToPush,
  subscribeToReminderSettings,
  unsubscribeFromPush,
} from "@/lib/notifications";
import { useAllSupplementReminders } from "@/lib/queries/supplementReminders";
import { useSupplementLogsForDate } from "@/lib/queries/supplementLogs";
import { useSupplements } from "@/lib/queries/supplements";

export function ReminderSettingsCard({ userId }: { userId: string }) {
  const settings = useSyncExternalStore(subscribeToReminderSettings, getReminderSettings, getServerReminderSettings);
  const permission = useSyncExternalStore(
    subscribeToReminderSettings,
    getNotificationPermission,
    getServerNotificationPermission,
  );

  const today = todayISO();
  const { data: supplements } = useSupplements(userId);
  const { data: reminders } = useAllSupplementReminders(userId);
  const { data: todayLogs } = useSupplementLogsForDate(userId, today);

  const todaysReminders =
    supplements && reminders
      ? computeTodaysReminders(
          supplements,
          reminders,
          new Set(todayLogs?.map((log) => log.supplement_id)),
          today,
          `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`,
        )
      : [];

  // Vangt het geval dat "Herinneringen" al aanstond vóórdat echte push
  // bestond — die gebruiker heeft nog geen push-inschrijving. Idempotent
  // (subscribeToPush hergebruikt een bestaande inschrijving), dus veilig om
  // ook bij elke volgende mount opnieuw te proberen.
  useEffect(() => {
    if (settings.enabled && permission === "granted") {
      subscribeToPush();
    }
  }, [settings.enabled, permission]);

  async function handleToggle(enabled: boolean) {
    if (enabled) {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        const result = await Notification.requestPermission();
        if (result !== "granted") {
          notifyReminderChange();
          return;
        }
      }
      await subscribeToPush();
    } else {
      await unsubscribeFromPush();
    }
    setReminderSettings({ ...settings, enabled });
  }

  async function sendTest() {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    registration.showNotification("Testmelding", {
      body: "Zo ziet een supplement-herinnering eruit.",
      icon: "/icons/icon-192.png",
    });
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bell size={16} className="text-muted-foreground" />
          Herinneringen
        </h2>
        <Toggle checked={settings.enabled} onChange={handleToggle} aria-label="Herinneringen aan/uit" />
      </div>

      {permission === "denied" && (
        <p className="mb-2 text-xs text-danger">
          Meldingen zijn geblokkeerd in je browser. Zet dit aan via de site-instellingen om herinneringen te
          ontvangen.
        </p>
      )}
      {permission === "unsupported" && (
        <p className="mb-2 text-xs text-muted-foreground">Meldingen worden niet ondersteund in deze browser.</p>
      )}

      {settings.enabled && permission === "granted" && (
        <Button variant="secondary" size="sm" onClick={sendTest}>
          Stuur testmelding
        </Button>
      )}

      {settings.enabled && permission === "granted" && (
        <div className="mt-3 rounded-lg bg-surface-muted p-3">
          <p className="mb-1.5 text-xs font-medium text-foreground">Vandaag ingepland</p>
          {todaysReminders.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Geen — geen supplement vandaag aan de beurt met een openstaande herinnering, of alles is al afgevinkt.
            </p>
          ) : (
            <ul className="space-y-1">
              {todaysReminders.map((r, i) => (
                <li
                  key={`${r.supplementId}-${i}`}
                  className={`text-xs ${r.isPast ? "text-muted-foreground line-through" : "text-foreground"}`}
                >
                  {r.clockTime} — {r.supplementName}
                  {r.isPast && " (tijdstip al voorbij, gaat vandaag niet meer af)"}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        De tijdstippen en herhaling stel je per supplement in bij het Supplementen-tabblad — maar alleen zolang je
        ze nog niet hebt afgevinkt. Werkt ook als de app dicht is (een server checkt elke paar minuten of er iets
        aan de beurt is). Op iPhone alleen als de app is toegevoegd aan het beginscherm (vanaf iOS 16.4).
      </p>
    </Card>
  );
}
