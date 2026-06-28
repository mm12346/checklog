const CACHE_NAME = 'checklog-cache-v4.8.1';

// ไฟล์ที่ต้องการแคชเก็บไว้เพื่อให้โหลดเร็วขึ้นหรือใช้งานตอนออฟไลน์ได้บางส่วน
const ASSETS_TO_CACHE = [
    './',
    './index.html', // เปลี่ยนชื่อให้ตรงกับไฟล์ HTML ของคุณ
    './admin-manifest.json',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700;800&display=swap',
    'https://raw.githubusercontent.com/mm12346/checklog/refs/heads/main/512.png'
];

// 1. Install Event: โหลดไฟล์ลง Cache
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
            .catch((error) => console.error('Cache addAll error:', error))
    );
});

// 2. Activate Event: ล้าง Cache เก่าเมื่อมีการอัปเดตเวอร์ชัน
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Clearing Old Cache');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. Fetch Event: ดึงข้อมูลจาก Cache หรือ Network
self.addEventListener('fetch', (event) => {
    // ยกเว้นการแคช API ของ Google Apps Script
    if (event.request.url.includes('script.google.com')) {
        return;
    }

    // สำหรับไฟล์ HTML (Navigation) ให้ดึงจาก Network ก่อน (Network First)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).then((networkResponse) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            }).catch(() => {
                // ถ้า Offline ค่อยดึง HTML จาก Cache
                return caches.match(event.request);
            })
        );
        return;
    }

    // สำหรับไฟล์อื่นๆ (JS, CSS, รูปภาพ) ใช้ Stale-While-Revalidate ตามเดิม
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            }).catch(() => {
                // กรณี Offline
            });

            return cachedResponse || fetchPromise;
        })
    );
});

