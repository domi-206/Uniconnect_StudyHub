// Unregister previous service workers to clear cache and fix loading issues
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister().then(() => {
      return self.clients.matchAll();
    }).then((clients) => {
      return Promise.all(clients.map((client) => client.navigate(client.url)));
    })
  );
});