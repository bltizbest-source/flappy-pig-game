const CACHE_NAME = 'flying-piggy-v1';
const ASSETS_TO_CACHE = [
  '/',
  'index.html',
  'style.css',
  'game.js',
  'manifest.json',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'favicon.png',
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap'
];

// Install Event: Cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Serve from cache if available, otherwise fetch from network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found
      if (response) {
        return response;
      }
      
      // Otherwise, try to fetch from network
      return fetch(event.request).catch(() => {
        // Fallback for offline (optional, but good for custom offline pages)
        console.error('[Service Worker] Fetch failed; returning offline fallback if applicable.');
      });
    })
  );
});
