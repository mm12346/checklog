// service-worker.js

const CACHE_NAME = 'usd-stock-tracker-v1.1';
const urlsToCache = [
    '/',
    '/index.html', // Assuming app0.html is served as index.html
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/swiper/swiper-bundle.min.css',
    'https://unpkg.com/swiper/swiper-bundle.min.js',
    'https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js',
    'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js',
    'https://placehold.co/192x192/5C5CFF/FFFFFF?text=Icon', // Apple touch icon
    'https://placehold.co/512x512/5C5CFF/FFFFFF?text=Icon'  // Apple touch startup image
];

// Install event: caches the necessary assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('[Service Worker] Caching failed:', error);
            })
    );
});

// Activate event: cleans up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                    return null;
                })
            );
        }).then(() => {
            // Ensure the service worker takes control immediately
            return self.clients.claim();
        })
    );
});

// Fetch event: serves content from cache first, then network
self.addEventListener('fetch', (event) => {
    // Only handle GET requests and specific origins to avoid issues with Firebase/Google APIs
    if (event.request.method === 'GET' && 
        !event.request.url.includes('googleapis.com') && 
        !event.request.url.includes('firebaseapp.com') &&
        !event.request.url.includes('tradingview.com') &&
        !event.request.url.includes('gstatic.com') &&
        !event.request.url.includes('unpkg.com')) { // Exclude external APIs from cache-first strategy
        
        event.respondWith(
            caches.match(event.request).then((response) => {
                if (response) {
                    console.log('[Service Worker] Serving from cache:', event.request.url);
                    return response;
                }
                console.log('[Service Worker] Fetching from network:', event.request.url);
                return fetch(event.request).then((networkResponse) => {
                    // Cache new requests if they are successful
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                }).catch(error => {
                    console.error('[Service Worker] Fetch failed:', event.request.url, error);
                    // You can return a fallback page here for offline scenarios
                    // For example: return caches.match('/offline.html');
                });
            })
        );
    } else {
        // For non-GET requests or excluded URLs, just fetch from network
        event.respondWith(fetch(event.request));
    }
});

// Listen for messages from the main thread (e.g., to trigger update notification)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting(); // Force the new service worker to activate immediately
    }
});

// Optional: Handle new service worker update available
self.addEventListener('controllerchange', () => {
    console.log('[Service Worker] Controller changed. New service worker is active.');
    // You could send a message to all clients to notify them of the update
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({ type: 'UPDATE_AVAILABLE' });
        });
    });
});
