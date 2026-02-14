/* service-worker.js — placed in /public so it's at the root scope */

const CACHE_NAME = "orderahead-v1";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

// ── Install: cache static shell ─────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ───────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for assets ────
self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("/rest/v1/") || event.request.url.includes("supabase")) {
    // Always network for Supabase API
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// ── Push Notification received ───────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "New Order!", body: "A customer just placed an order.", icon: "/icons/icon-192.png" };
  try {
    data = { ...data, ...event.data.json() };
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [200, 100, 200],
      tag: "new-order",
      renotify: true,
      data: { url: data.url || "/dashboard" },
    })
  );
});

// ── Notification click: open / focus the dashboard ──────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(target) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
