// Change à chaque publication : les joueurs récupèrent alors la nouvelle version.
const CACHE = 'cqfd-mvkpzzbp';
const FILES = ["./","index.html","style.css","app.js","manifest.webmanifest","icons/icon.svg","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png","fonts/source-serif-4.woff2","fonts/source-serif-4-italic.woff2","fonts/instrument-sans.woff2","fonts/playwrite.woff2"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' }))))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // réseau d'abord (toujours la dernière version quand on est en ligne), cache en secours (hors ligne)
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => {
    if (r && r.ok && new URL(e.request.url).origin === location.origin) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
