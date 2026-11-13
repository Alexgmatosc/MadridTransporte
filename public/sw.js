// MadridTransporte Service Worker - Auto Cache Invalidator
const CACHE_NAME = 'madrid-transporte-v4';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Real-time transit APIs and proxies: ALWAYS Network Only (never cache)
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('pmv.aspx') ||
    url.hostname.includes('emtmadrid.es') ||
    url.hostname.includes('metromadrid.es') ||
    url.hostname.includes('gtfsrt.renfe.com') ||
    url.hostname.includes('renfe.com') ||
    url.hostname.includes('allorigins.win') ||
    url.hostname.includes('corsproxy.io') ||
    url.searchParams.has('_t')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. HTML documents (index.html): Network first so new deployments load immediately
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // 2b. Static transit datasets (/data/*.json): Network first so catalog updates load immediately
  if (url.pathname.startsWith('/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
    );
    return;
  }

  // 3. Static assets with Vite hashes or static images/fonts: Cache First
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/splash/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((response) => {
            if (response.status === 200 && response.type === 'basic') {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
        );
      })
    );
    return;
  }

  // 4. Default fallback: Network Only
  event.respondWith(fetch(event.request));
});
