const CACHE_NAME = 'mobilitat-tortosa-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache solo assets estáticos, no HTML
      return cache.addAll([
        './manifest.json'
      ]);
    }).catch(() => {
      // Si falla el install, continuar
      return Promise.resolve();
    })
  );
  // Force activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control immediately
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.navigate(client.url);
    });
  });
});

self.addEventListener('fetch', (event) => {
  // Network first for HTML
  if (event.request.url.includes('.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Cache first para otros assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});