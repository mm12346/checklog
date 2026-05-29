// Service Worker for Check Log Admin PWA
const CACHE_NAME = 'checklog-admin-v4.4';
const urlsToCache = [
    './',
    './index.html',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&display=swap',
    'https://fonts.gstatic.com/s/sarabun/v15/DtVjJx26TKEr37c9WJpP.woff2', // Example font file
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://raw.githubusercontent.com/mm12346/checklog/refs/heads/main/512.png',
    'https://raw.githubusercontent.com/mm12346/checklog/refs/heads/main/180.png',
    'https://raw.githubusercontent.com/mm12346/checklog/refs/heads/main/192.png'
];

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

self.addEventListener('fetch', (event) => {
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                }).catch((error) => {
                    console.error('Fetch failed:', error);
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
                });
            })
        );
    }
});
