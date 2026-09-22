const STATIC_CACHE = "akai-static-v1";
const IMAGE_CACHE = "akai-images-v1";
const API_CACHE_PREFIX = "akai-api-v1-";
const OFFLINE_URLS = ["/en/offline", "/ur/offline"];
let userScope = null;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll([...OFFLINE_URLS, "/icons/akai-icon-192.png", "/icons/akai-icon-512.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SET_USER_SCOPE" && typeof event.data.userId === "string") userScope = event.data.userId;
  if (event.data?.type === "CLEAR_USER_SCOPE") {
    const previousScope = userScope;
    userScope = null;
    if (previousScope) event.waitUntil(caches.delete(`${API_CACHE_PREFIX}${previousScope}`));
  }
});

async function networkFirst(request) {
  const cache = userScope ? await caches.open(`${API_CACHE_PREFIX}${userScope}`) : null;
  try {
    const response = await fetch(request);
    if (cache && response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = cache ? await cache.match(request) : null;
    return cached || new Response(JSON.stringify({ error: "You are offline. Reconnect to refresh this data." }), { status: 503, headers: { "content-type": "application/json" } });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (request.destination === "image" || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.destination === "script" || request.destination === "style" || request.destination === "font") {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => caches.open(STATIC_CACHE).then((cache) => { if (response.ok) void cache.put(request, response.clone()); return response; }))));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = userScope ? await caches.open(`${API_CACHE_PREFIX}${userScope}`) : null;
      try {
        const response = await fetch(request);
        if (cache && response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        const fallback = url.pathname.startsWith("/ur") ? "/ur/offline" : "/en/offline";
        return (cache ? await cache.match(request) : null) || caches.match(fallback);
      }
    })());
  }
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "AKAI CRM", {
    body: data.body || "You have a new notification.",
    data: { linkUrl: data.linkUrl || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const linkUrl = event.notification.data && event.notification.data.linkUrl;
  if (linkUrl) event.waitUntil(clients.openWindow(linkUrl));
});
