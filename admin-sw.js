// Service Worker for Check Log Admin PWA
const CACHE_NAME = 'checklog-admin-cache-v1';
const urlsToCache = [
  './', // Caches the root path, which typically serves index.html
  './index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&display=swap',
  'https://raw.githubusercontent.com/mm12346/checklog/refs/heads/main/512.png', // Website icon
  'https://raw.githubusercontent.com/mm12346/checklog/refs/heads/main/180.png', // Apple touch icon
  'https://raw.githubusercontent.com/mm12346/checklog/refs/heads/main/192.png', // Icon for manifest
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js' // Excel library
  // Add other static assets like CSS, JS, images if they are local files
  // For external API calls, we'll use a network-first strategy
];

// Install event: Caches static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Caching failed', error);
      })
  );
});

// Activate event: Cleans up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event: Intercepts network requests
self.addEventListener('fetch', (event) => {
  // Check if the request is for an API call (Google Apps Script URLs)
  const isDailyApi = event.request.url.includes('script.google.com/macros/s/AKfycb');
  const isMonthlyApi = event.request.url.includes('script.google.com/macros/s/AKfycb'); // Assuming similar pattern for monthly

  if (isDailyApi || isMonthlyApi) {
    // For API calls, use a network-first strategy
    // This means try to fetch from the network first, if it fails, try the cache
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          // If network request is successful, clone the response and cache it
          const responseToCache = response.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, responseToCache);
          return response;
        })
        .catch(async () => {
          // If network fails, try to get from cache
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // If not in cache, return an error response or a fallback
          return new Response('Network error or API not cached.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        })
    );
  } else {
    // For other static assets, use a cache-first strategy
    // This means try to get from cache first, if not found, fetch from network
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request).then(async (fetchResponse) => {
            // Cache new requests if they are successful
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        })
        .catch((error) => {
          console.error('Service Worker: Fetch failed for static asset', error);
          // You can return a fallback page here if offline
          // return caches.match('/offline.html');
        })
    );
  }
});
