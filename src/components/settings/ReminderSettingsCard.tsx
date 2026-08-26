"use client";

import { Bell } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button, Card, Toggle } from "@/components/ui";
import {
  getNotificationPermission,
  getReminderSettings,
  getServerNotificationPermission,
  getServerReminderSettings,
  notifyReminderChange,
  setReminderSettings,
  subscribeToReminderSettings,
} from "@/lib/notifications";

export function ReminderSettingsCard() {
  const settings = useSyncExternalStore(subscribeToReminderSettings, getReminderSettings, getServerReminderSettings);
  const permission = useSyncExternalStore(
    subscribeToReminderSettings,
    getNotificationPermission,
    getServerNotificationPermission,
  );

  async function handleToggle(enabled: boolean) {
    if (enabled && typeof Notification !== "undefined" && Notification.permission === "default") {
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        notifyReminderChange();
        return;
      }
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

      <p className="mt-3 text-xs text-muted-foreground">
        De tijdstippen en herhaling stel je per supplement in bij het Supplementen-tabblad — maar alleen zolang je
        ze nog niet hebt afgevinkt. Best-effort: werkt direct op Android/desktop zolang de app open is. Op iPhone
        alleen als de app is toegevoegd aan het beginscherm (vanaf iOS 16.4) — en ook dan alleen zolang die niet
        volledig is afgesloten.
      </p>
    </Card>
  );
}
