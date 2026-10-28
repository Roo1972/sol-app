// Sol service worker — network first, so every deploy reaches returning visitors.
// Falls back to the last good copy only when offline.
const CACHE = 'sol-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    // Reload any page still showing a version served by the old worker.
    const pages = await self.clients.matchAll({ type: 'window' });
    pages.forEach(p => p.navigate(p.url).catch(() => {}));
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch {
      const hit = await caches.match(req);
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const home = await caches.match('/');
        if (home) return home;
      }
      throw new Error('offline');
    }
  })());
});
