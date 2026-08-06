const CACHE_NAME = 'coachoop-cache-v2';
const APP_SHELL = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// התקנה: שמירת קבצים סטטיים שלא משתנים הרבה (אייקונים, מניפסט)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// הפעלה: ניקוי מטמונים ישנים מגרסאות קודמות
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // רק בקשות GET מאותו מקור (האתר עצמו) מטופלות ע"י ה-Service Worker
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  const isHTMLPage = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/';

  if (isHTMLPage) {
    // עמוד ה-HTML הראשי: תמיד ננסה קודם רשת (כדי לקבל עדכונים מיד),
    // ורק אם אין רשת - ניפול חזרה למטמון
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // קבצים סטטיים (אייקונים, מניפסט): מטמון קודם, רשת כגיבוי
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
