const appPrefix = 'currency-converter-static',
  cacheVersion = 'v1',
  staticCacheName = `${appPrefix}-${cacheVersion}`,
  repoPrefix = '/currency_converter/',
  URLS = [
    repoPrefix,
    `${repoPrefix}index.html`,
    `${repoPrefix}index.js`,
    `${repoPrefix}js/idb.js`,
    `${repoPrefix}css/style.css`,
    'https://fonts.googleapis.com/css?family=Roboto:400,700'
  ];


self.addEventListener('install', event => {
  //cache static assets(html, css, js, fonts, img, etc)
  event.waitUntil(
    caches.open(staticCacheName).then(cache => {
      return cache.addAll(URLS);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('currency-converter-') &&
                cacheName !== staticCacheName;
        }).map(cacheName => caches.delete(cacheName))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
        return response || fetch(event.request);
    })
  );
});