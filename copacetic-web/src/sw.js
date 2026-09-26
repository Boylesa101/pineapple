// copacetic.web service worker. build.mjs fills in the version and file lists.
const VERSION = '__VERSION__';
const CACHE = 'copacetic-' + VERSION;
const PAGES = __PAGES__;
const ASSETS = __ASSETS__;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PAGES.concat(ASSETS))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('copacetic-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// "/services/" and "/services.html" are the same page as "/services".
const pageKey = url => {
  let p = url.pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
  if (p.length > 1) p = p.replace(/\/$/, '');
  return p;
};

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // Pages: network first so updates show straight away, cache when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok && PAGES.includes(pageKey(url))) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(pageKey(url), copy));
          }
          return res;
        })
        .catch(() => caches.match(pageKey(url)).then(hit => hit || caches.match('/404')))
    );
    return;
  }

  // Everything else (CSS, JS, fonts, images): cache first.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
