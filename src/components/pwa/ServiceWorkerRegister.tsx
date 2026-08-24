"use client";

import { useEffect } from "react";

/**
 * Alleen in productie registreren. In `next dev` compileert Turbopack routes
 * on-demand (kan een paar seconden duren), en dat botst met de service worker
 * se navigatie-timeout — dat gaf ten onrechte de offline-pagina te zien terwijl
 * de dev-server prima draaide. Eventuele al-geïnstalleerde SW van eerder testen
 * wordt hier ook actief opgeruimd, zodat dev altijd rechtstreeks het netwerk gebruikt.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best-effort — een mislukte registratie mag de app niet breken.
    });
  }, []);

  return null;
}
