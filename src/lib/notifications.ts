export interface ReminderSettings {
  enabled: boolean;
}

const STORAGE_KEY = "reminder-settings";
const CHANGE_EVENT = "reminder-settings-change";

const DEFAULTS: ReminderSettings = {
  enabled: false,
};

// useSyncExternalStore requires getSnapshot to return a referentially stable
// value when nothing changed — recomputing a fresh object on every call caused
// an infinite render loop (crash) as soon as a setting was actually stored.
let cachedRaw: string | null = null;
let cachedSettings: ReminderSettings = DEFAULTS;

export function getReminderSettings(): ReminderSettings {
  if (typeof window === "undefined") return DEFAULTS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSettings;
  cachedRaw = raw;
  try {
    cachedSettings = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    cachedSettings = DEFAULTS;
  }
  return cachedSettings;
}

export function getServerReminderSettings(): ReminderSettings {
  return DEFAULTS;
}

export function notifyReminderChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function setReminderSettings(settings: ReminderSettings) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  notifyReminderChange();
}

export function subscribeToReminderSettings(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

export type NotificationPermissionState = NotificationPermission | "unsupported";

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export function getServerNotificationPermission(): NotificationPermissionState {
  return "unsupported";
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Meldt de browser aan voor echte Web Push (werkt ook als de app dicht is) en
 * stuurt de inschrijving naar de server. Best-effort: geeft `false` terug als
 * push niet ondersteund wordt of de publieke VAPID-key ontbreekt, in plaats
 * van te gooien — de lokale herinneringen blijven dan gewoon werken.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
  } catch {
    // Best-effort — een mislukte opruiming mag het uitzetten van de instelling niet blokkeren.
  }
}
