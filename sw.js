const staticCacheName = 'currency-converter-static-v1';


self.addEventListener('install', event => {
  //cache static assets(html, css, js, fonts, img)
  event.waitUntil(
    caches.open(staticCacheName).then(cache => {
      return cache.addAll([
        '/',
        'index.js',
        'css/style.css',
        'https://fonts.googleapis.com/css?family=Roboto:400,700'
      ]);
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
    caches.open(staticCacheName).then(cache => {
      return cache.match(event.request).then(response => {
        return response || fetch(event.request);
      });
    })
  );
});