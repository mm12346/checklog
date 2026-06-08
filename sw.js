const CACHE_NAME = 'checklog-cache-v4.6.0';

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
    // ยกเว้นการแคช API ของ Google Apps Script เพื่อให้ดึงข้อมูลอัปเดตแบบเรียลไทม์เสมอ
    if (event.request.url.includes('script.google.com')) {
        return;
    }

    // กลยุทธ์: Stale-While-Revalidate (ดึงของจาก Cache ก่อน แล้วแอบไปอัปเดตของใหม่จาก Network)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // อัปเดต Cache ด้วยข้อมูลใหม่
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            }).catch(() => {
                // กรณี Offline และไม่มี Cache จะคืนค่าว่างๆ หรือหน้า Offline ไป
            });

            // คืนค่า Cache ทันทีถ้ามี ถ้าไม่มีให้รอผลจาก fetchPromise
            return cachedResponse || fetchPromise;
        })
    );
});
