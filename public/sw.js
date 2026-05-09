const CACHE_NAME = 'chef-music-v1';
const urlsToCache = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

// Keep service worker alive for background audio
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'KEEP_ALIVE') {
    // Respond to keep the service worker active
    event.ports[0].postMessage({ status: 'alive' });
  }
});

// Prevent service worker from being terminated when audio is playing
let keepAliveInterval;
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());

  // Keep service worker alive to support background audio
  keepAliveInterval = setInterval(() => {
    self.clients.matchAll().then(clients => {
      if (clients.length === 0) {
        // No clients, we can stop the keep-alive
        clearInterval(keepAliveInterval);
      }
    });
  }, 30000); // Ping every 30 seconds
});
