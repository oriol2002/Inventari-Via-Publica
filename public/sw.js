const CACHE_NAME = 'mobilitat-tortosa-v4';

self.addEventListener('install', (event) => {
  // Force activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ALL old caches
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // For API requests and HTML, always go network-first
  if (request.url.includes('/api/') || 
      request.url.includes('supabase.co') ||
      request.mode === 'navigate' ||
      request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Don't cache API responses
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Network error', { status: 503 });
        })
    );
  } else {
    // For static assets, use cache-first with network fallback
    event.respondWith(
      caches.match(request)
        .then(cached => {
          if (cached) {
            // Return cached but also fetch fresh in background
            fetch(request).then(response => {
              if (response.ok) {
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(request, response);
                });
              }
            });
            return cached;
          }
          // Not in cache, fetch from network
          return fetch(request).then(response => {
            if (response.ok) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, response);
              });
            }
            return response;
          });
        })
    );
  }
});

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});