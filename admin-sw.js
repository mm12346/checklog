// Service Worker for Check Log Admin PWA
const CACHE_NAME = 'checklog-admin-v4.31'; // อัปเดตเวอร์ชันเพื่อบังคับล้างแคชเก่า

const urlsToCache = [
    './',
    './index.html',
    './admin-manifest.json', // เพิ่มไฟล์ Manifest
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700;800&display=swap', // อัปเดตลิงก์ฟอนต์ให้ตรงกับ HTML
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://raw.githubusercontent.com/mm12346/checklog/refs/heads/main/512.png',
    'https://raw.githubusercontent.com/mm12346/checklog/refs/heads/main/180.png',
    'https://raw.githubusercontent.com/mm12346/checklog/refs/heads/main/192.png',
    'https://raw.githubusercontent.com/mm12346/checklog/refs/heads/main/vdio/1.jpg', // เพิ่มรูปหน้าปกวิดีโอคู่มือ
    'https://raw.githubusercontent.com/mm12346/checklog/refs/heads/main/vdio/2.jpg'  // เพิ่มรูปหน้าปกวิดีโอคู่มือ
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
    // 🚨 ป้องกันการแคชข้อมูลจาก Google Apps Script API (ดึงข้อมูล Real-time เสมอ)
    if (event.request.url.includes('script.google.com')) {
        return; // ปล่อยให้เบราว์เซอร์จัดการดึงข้อมูลจากอินเทอร์เน็ตโดยตรง
    }

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
