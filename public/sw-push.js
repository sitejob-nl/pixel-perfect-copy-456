// Push notification handler for the service worker
// This file is imported by vite-plugin-pwa's generated SW

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "SiteJob", body: event.data.text() };
  }

  const options = {
    body: data.body || "",
    icon: "/pwa-192.png",
    badge: "/pwa-192.png",
    tag: data.event_type || "general",
    renotify: true,
    data: {
      url: data.url || "/",
    },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(data.title || "SiteJob", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if possible
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window
        return clients.openWindow(urlToOpen);
      })
  );
});
