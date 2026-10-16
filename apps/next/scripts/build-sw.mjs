import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const assets = readdirSync('dist/assets').filter(x => /\.(js|css)$/.test(x)).map(x => './assets/' + x);
const files = ['./', './index.html', './icon.svg', './manifest.webmanifest', ...assets];
const version = createHash('sha256').update(files.map(x => x === './' ? '' : readFileSync('dist/' + x.slice(2))).join('')).digest('hex').slice(0,12);
writeFileSync('dist/sw.js', `
const CACHE = 'rs2-next-shell-${version}';
const FILES = ${JSON.stringify(files)};
const urls = new Set(FILES.map(p => new URL(p, self.registration.scope).href));
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
// No skipWaiting: updates must not interrupt an open editing session.
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('rs2-next-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !urls.has(event.request.url)) return;
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
});
`);
