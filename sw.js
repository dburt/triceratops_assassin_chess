const CACHE_NAME = 'special-chess-v5';
const urlsToCache = [
  '/chess/',
  '/chess/index.html',
  '/chess/style.css',
  '/chess/js/main.js',
  '/chess/js/game.js',
  '/chess/js/ui.js',
  '/chess/js/network.js',
  '/chess/js/state.js',
  '/chess/js/config.js',
  '/chess/images/icon.svg',
  '/chess/manifest.json',
  'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js'
];

// Install: Cache assets and take control immediately
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        // Force the waiting service worker to become the active service worker.
        return self.skipWaiting();
      })
  );
});

// Activate: Clean up old caches and take control of clients
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('special-chess-') && cacheName !== CACHE_NAME;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      // Tell the active service worker to take control of the page immediately.
      return self.clients.claim();
    })
  );
});

// Fetch: Network-first, then cache
self.addEventListener('fetch', function(event) {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
      return;
  }
  
  event.respondWith(
    fetch(event.request).then(function(response) {
      // Network request was successful.
      // Check for a valid response to cache. Opaque responses (from no-cors requests) have status 0.
      if (!response || response.status !== 200) {
        return response;
      }
      
      // Clone the response and cache it.
      const responseToCache = response.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(event.request, responseToCache);
      });
      return response;
      
    }).catch(function() {
      // Network request failed, serve from cache
      return caches.match(event.request);
    })
  );
});
