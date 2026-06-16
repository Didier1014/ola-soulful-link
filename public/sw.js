self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || "Redox Pay";
    const options = {
      body: data.body || "",
      icon: data.icon || "/favicon.ico",
      badge: data.badge || "/favicon.ico",
      data: { url: data.url || "/dashboard" },
      vibrate: [200, 100, 200],
      requireInteraction: true,
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    event.waitUntil(self.registration.showNotification("Redox Pay", { body: event.data.text() }));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(clients.openWindow(url));
});
