
const CACHE_NAME = "aramex109-gatehouse-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of APP_SHELL) {
        try {
          const response = await fetch(url, { cache: "no-cache" });
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (error) {
          // Skip unavailable files during installation.
        }
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("aramex109-gatehouse-") &&
                           key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never intercept Firebase, authentication, or other external requests.
  if (url.origin !== self.location.origin) return;

  // Only serve cached app-shell files for navigation and GET requests.
  if (request.method !== "GET") return;

  const isAppShell =
    url.pathname === new URL("./", self.location.href).pathname ||
    url.pathname === new URL("./index.html", self.location.href).pathname ||
    url.pathname === new URL("./manifest.json", self.location.href).pathname ||
    url.pathname === new URL("./icons/icon-192.png", self.location.href).pathname ||
    url.pathname === new URL("./icons/icon-512.png", self.location.href).pathname;

  if (!isAppShell) return;

  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) =>
          cache.put(request, copy)
        );
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      throw new Error("Offline and no cached app file is available.");
    })
  );
});
