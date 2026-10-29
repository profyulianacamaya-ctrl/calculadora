/* Service worker: guarda la app para usarla sin conexión.
   Sirve desde la caché y la actualiza en segundo plano. Al publicar cambios, subir VERSION. */
const VERSION = "serie-pm-v5";
const ARCHIVOS = ["./", "./index.html", "./calc.js", "./manifest.json", "./icon.svg",
                  "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", ev => {
  ev.waitUntil(caches.keys()
    .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  ev.respondWith(caches.open(VERSION).then(async cache => {
    const enCache = await cache.match(req, { ignoreSearch: true }) ||
                    (req.mode === "navigate" ? await cache.match("./index.html") : undefined);
    const deRed = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => enCache);
    if (enCache) { ev.waitUntil(deRed); return enCache; }
    return deRed;
  }));
});
