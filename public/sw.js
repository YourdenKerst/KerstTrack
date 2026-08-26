// Simpele, handgeschreven service worker: cachet de app-shell (statische
// assets) voor een snelle herstart, en toont een nette offline-pagina in
// plaats van een browserfoutpagina als er echt geen verbinding is. Geen
// volledige offline datasync — de data staat in Supabase (zie SETUP.md).

const CACHE_NAME = "tracker-shell-v2";
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => {
            // Eén ontbrekende URL mag de install niet laten falen.
          }),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Echte Web Push: komt van de server binnen (zie /api/push/send-due), werkt
// ook als de app/tab niet open is. Aanvullend op de lokale setTimeout-planning
// in SupplementReminders.tsx (die alleen werkt zolang de app open is) — beide
// gebruiken dezelfde `tag`, dus een dubbele melding voor hetzelfde supplement
// vervangt elkaar in plaats van te stapelen.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Supplement-herinnering", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      tag: data.tag,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientsArr) => {
      const existing = clientsArr.find((c) => "focus" in c);
      if (existing) return existing.focus();
      return self.clients.openWindow("/");
    }),
  );
});

/**
 * Eén fetch-poging met timeout; bij mislukking (of timeout) nog één herkansing.
 * Voorkomt dat een kortstondige netwerk-hapering meteen als "offline" wordt
 * behandeld — dat gaf eerder de offline-pagina te zien terwijl er wél verbinding was.
 */
async function fetchWithRetry(request, { retries = 1, timeoutMs = 4000 } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs));
      return await Promise.race([fetch(request.clone()), timeout]);
    } catch (err) {
      if (attempt >= retries) throw err;
    }
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pagina-navigatie: netwerk eerst (met 1 herkansing), val terug op een
  // gecachete versie van dezelfde pagina of anders de offline-pagina.
  if (request.mode === "navigate") {
    event.respondWith(
      fetchWithRetry(request)
        .then((response) => {
          // Alleen succesvolle, niet-omgeleide responses cachen — een
          // auth-redirect (bv. "/" -> "/login") mag niet onder de "/"-key
          // belanden, anders krijg je later de verkeerde pagina uit cache.
          if (response.ok && !response.redirected) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Statische build-assets en icons: cache eerst, verversen op de achtergrond.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
        return cached ?? networkFetch;
      }),
    );
  }
});
