// public/service-worker.js — Member 1: Frontend Developer
// PWA Service Worker — offline caching + push notification handler

const CACHE_NAME = 'disaster-coord-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/css/main.chunk.css',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json'
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return; // never cache API calls

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match('/index.html')); // fallback for navigation
    })
  );
});

// Push notification received
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const { title = '🛡️ Disaster Alert', body = 'New update', icon = '/icons/icon-192.png', actions = [], data: payload = {} } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icons/badge.png',
      vibrate: [200, 100, 200],
      data: payload,
      actions
    })
  );
});

// Notification click — open app to relevant screen
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { requestId, ngoId } = event.notification.data || {};
  let url = '/';
  if (requestId) url = `/requests/${requestId}`;
  else if (ngoId) url = `/admin/ngos/${ngoId}`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find(c => c.url === url && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

// Background sync — retry failed SOS submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sos-requests') {
    event.waitUntil(syncPendingRequests());
  }
});

async function syncPendingRequests() {
  const db = await openIndexedDB();
  const pending = await db.getAll('pending-requests');
  for (const req of pending) {
    try {
      await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${req.token}` }, body: JSON.stringify(req.data) });
      await db.delete('pending-requests', req.id);
      console.log('✅ Synced offline SOS request:', req.id);
    } catch (err) {
      console.error('❌ Sync failed for request:', req.id);
    }
  }
}
