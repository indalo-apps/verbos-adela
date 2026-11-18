// Irregular Verbs: funciona sin conexión.
// La página siempre se pide primero a internet (así llegan las versiones nuevas);
// si no hay conexión, se usa la última copia guardada.
const CACHE = "irregular-verbs";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // version.json: siempre de internet, nunca de la copia
  if (url.pathname.endsWith("version.json")) return;

  // tipos de letra de Google: copia primero, se guardan la primera vez
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      c.put(req, res.clone());
      return res;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // la app y sus archivos: primero internet, si falla la copia guardada
  e.respondWith(
    fetch(req, { cache: "no-store" }).then(res => {
      if (res.ok) {
        const copy = res.clone();
        const key = req.mode === "navigate" ? "index.html" : req;
        caches.open(CACHE).then(c => c.put(key, copy));
      }
      return res;
    }).catch(async () => {
      const c = await caches.open(CACHE);
      return (await c.match(req, { ignoreSearch: true })) ||
             (req.mode === "navigate" ? c.match("index.html") : Response.error());
    })
  );
});
