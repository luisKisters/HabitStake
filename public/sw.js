const CACHE_NAME = "habitstake-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Push notification received
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "HabitStake", {
      body: data.body,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      data: { url: data.url || "/dashboard" },
    })
  );
});

// Notification tapped
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// Background sync — triggered by the client when back online
self.addEventListener("sync", (event) => {
  if (event.tag === "habit-sync") {
    // Signal to any open client to flush their offline queue
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((windowClients) => {
        windowClients.forEach((client) =>
          client.postMessage({ type: "SYNC_HABITS" })
        );
      })
    );
  }
});
