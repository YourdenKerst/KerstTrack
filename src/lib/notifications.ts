export interface ReminderSettings {
  enabled: boolean;
}

const STORAGE_KEY = "reminder-settings";
const CHANGE_EVENT = "reminder-settings-change";

const DEFAULTS: ReminderSettings = {
  enabled: false,
};

/** Vaste momenten voor supplementen zonder een eigen `reminder_time` (zie SupplementManager). */
export const GENERIC_REMINDER_TIMES = ["09:00", "13:00", "20:00"] as const;

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
