// Service Worker for Check Log Admin PWA
const CACHE_NAME = 'checklog-admin-v24';
const urlsToCache = [
    './',
    './index.html',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&display=swap',
    'https://fonts.gstatic.com/s/sarabun/v15/DtVjJx26TKEr37c9WJpP.woff2', // Example font file, adjust if needed
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://raw.githubusercontent.com/mm12346/checklog/refs/heads/main/512.png', // Website icon
    'https://raw.githubusercontent.com/mm12346/checklog/refs/heads/main/180.png', // Apple touch icon
    'https://raw.githubusercontent.com/mm12346/checklog/refs/heads/main/192.png' // PWA icon
    // Add other critical assets here if they are static and should be cached
];

// Install event: caches the static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Failed to cache during install:', error);
            })
    );
});

// Activate event: cleans up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event: serves cached content or fetches from network
self.addEventListener('fetch', (event) => {
    // Only handle GET requests for navigation and static assets
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then((response) => {
                // Return cached response if found
                if (response) {
                    return response;
                }
                // If not in cache, fetch from network
                return fetch(event.request).then((networkResponse) => {
                    // Check if we received a valid response
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    // Cache the new response for future use
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                }).catch((error) => {
                    console.error('Fetch failed:', error);
                    // Optionally, serve an offline page or fallback content
                    // For example, return a generic offline page if the request is for a document
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html'); // Fallback to main page for navigation requests
                    }
                    // For other requests (e.g., images, scripts), you might return nothing or a placeholder
                    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
                });
            })
        );
    }
});
