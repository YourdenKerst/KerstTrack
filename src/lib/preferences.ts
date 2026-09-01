// Losse client-side voorkeuren die geen eigen instellingenscherm rechtvaardigen
// — zelfde patroon als thema (lib/theme.ts): localStorage + custom event,
// zodat useSyncExternalStore er meteen op kan reageren.

const WATER_TRACKING_KEY = "water-tracking-enabled";
const WATER_TRACKING_EVENT = "watertrackingchange";

export function getWaterTrackingEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(WATER_TRACKING_KEY) !== "false";
}

export function getServerWaterTrackingEnabled(): boolean {
  return true;
}

export function setWaterTrackingEnabled(enabled: boolean) {
  window.localStorage.setItem(WATER_TRACKING_KEY, String(enabled));
  window.dispatchEvent(new Event(WATER_TRACKING_EVENT));
}

export function subscribeToWaterTrackingChanges(callback: () => void): () => void {
  window.addEventListener(WATER_TRACKING_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(WATER_TRACKING_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
