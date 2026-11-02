/* Minimal offline-first service worker: cache app shell, network-first for fonts. */
const CACHE = 'bumpling-v1';
const SHELL = [
  './', './index.html', './css/index.css', './manifest.webmanifest',
  './js/i18n.js', './js/standards.js', './js/content.js', './js/store.js', './js/engine.js', './js/ui.js', './js/mascot.js', './icon.svg', './icon-maskable.svg', './apple-touch-icon.png', './icon-192.png', './icon-512.png',
  './js/views/onboarding.js', './js/views/home.js', './js/views/weight.js', './js/views/diet.js',
  './js/views/exercise.js', './js/views/guide.js', './js/views/tools.js', './js/views/me.js', './js/app.js',
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Network-first everywhere (keeps dev fresh), cache fallback for offline use.
  e.respondWith(fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; }).catch(() => caches.match(e.request)));
});
