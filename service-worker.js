// Service Worker del Vademécum - habilita el uso offline.
// IMPORTANTE: al actualizar contenido (nuevos fármacos, cambios de CSS/JS),
// subir el número de versión de CACHE_NAME para que los dispositivos
// descarguen la versión nueva en lugar de seguir usando la cacheada.
const CACHE_NAME = "vademecum-cache-v2";

const ARCHIVOS_APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/app.js",
  "./data/farmacos.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Estrategia: "network first, falling back to cache" para farmacos.json
// (para traer datos nuevos si hay conexión), y "cache first" para el resto.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.endsWith("farmacos.json")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cacheado) => {
      return (
        cacheado ||
        fetch(event.request).then((res) => {
          const copia = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          return res;
        }).catch(() => cacheado)
      );
    })
  );
});
