// กำหนดชื่อแคชและเวอร์ชัน
const CACHE_NAME = 'usd-stock-tracker-v2.0.0'; // อัปเดตเวอร์ชันเมื่อมีการเปลี่ยนแปลงไฟล์
const urlsToCache = [
  '/', // หรือ '/index.html' หากไฟล์หลักของคุณชื่อ index.html
  '/Untitled-1.html', // ชื่อไฟล์ HTML หลักของคุณ
  '/manifest.json',
  // เพิ่ม URL ของไอคอนที่คุณใช้ใน manifest.json ที่นี่
  'https://placehold.co/192x192/5C5CFF/FFFFFF?text=Icon',
  'https://placehold.co/512x512/5C5CFF/FFFFFF?text=Icon',
  // เพิ่มไฟล์ CSS, JS, หรือรูปภาพอื่นๆ ที่คุณต้องการให้แคช
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/swiper/swiper-bundle.min.css',
  'https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://unpkg.com/swiper/swiper-bundle.min.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js',
  'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
];

// Event: install
// ติดตั้ง Service Worker และแคชไฟล์ที่จำเป็น
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

// Event: fetch
// ดักจับคำขอเครือข่ายและตอบกลับจากแคชหรือเครือข่าย
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // หากพบในแคช ให้ตอบกลับจากแคช
        if (response) {
          return response;
        }
        // หากไม่พบในแคช ให้เรียกจากเครือข่าย
        return fetch(event.request)
          .then((response) => {
            // ตรวจสอบว่าการตอบกลับถูกต้อง
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            // คัดลอกการตอบกลับเพื่อแคช (response stream สามารถอ่านได้เพียงครั้งเดียว)
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          })
          .catch((error) => {
            console.error('Fetch failed:', error);
            // สามารถตอบกลับด้วยหน้าออฟไลน์ได้ที่นี่
            // เช่น return caches.match('/offline.html');
          });
      })
  );
});

// Event: activate
// ลบแคชเก่าที่ไม่เกี่ยวข้อง
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // ลบแคชที่ไม่ตรงกับ whitelist
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        // แจ้งเตือน client (หน้าเว็บ) ว่ามี Service Worker ใหม่พร้อมใช้งาน
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({ type: 'UPDATE_AVAILABLE' });
            });
        });
    })
  );
});

// Event: message (สำหรับรับข้อความจากหน้าเว็บ)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting(); // บังคับให้ Service Worker ใหม่ทำงานทันที
  }
});
