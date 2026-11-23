// Irregular Verbs: funciona sin conexión.
// La página siempre se pide primero a internet (así llegan las versiones nuevas);
// si no hay conexión, se usa la última copia guardada.
// Al subir una versión nueva, cambia el nombre de la caché y se borra la anterior.
const CACHE = "irregular-verbs-44";
const CORE = ["./", "index.html", "nunito.woff", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "icon-152.png", "icon-167.png", "icon-maskable-512.png", "favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("irregular-verbs") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Comprobación de versión nueva (?v=…) y version.json: siempre de internet, nunca de la copia
  if (url.pathname.endsWith("version.json") || (url.origin === location.origin && url.searchParams.has("v") && /^\d{10,}$/.test(url.searchParams.get("v")))) return;

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
