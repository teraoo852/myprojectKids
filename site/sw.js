/* サービスワーカー: 1度開けば ネットが無くても開ける（spec §8）
 * ★ site/ のファイルを変えて push するときは、VERSION の数を1つ上げる（上げ忘れると iPad が古いまま）
 * ★ ファイルを足したり消したりしたら FILES も直す（tests/check.mjs が site/ と照らし合わせる） */
var VERSION = 'kids-v2';
var FILES = [
  "./",
  "index.html",
  "css/style.css",
  "js/data.js",
  "js/icons.js",
  "js/trace.js",
  "js/app.js",
  "manifest.webmanifest",
  "icon-180.png",
  "fonts/zen-maru-gothic-700.woff2",
  "fonts/zen-maru-gothic-900.woff2"
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION)
      // GitHub Pages のキャッシュ（10分）を通さず、いつも新しいものを取る
      .then(function (c) { return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

/* キャッシュを先に使い、無ければ取りに行く */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || fetch(e.request); })
  );
});
