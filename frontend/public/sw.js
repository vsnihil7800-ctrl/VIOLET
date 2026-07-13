const CACHE_NAME = "violet-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event (Cache Cleanups)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Interceptor
self.addEventListener("fetch", (event) => {
  // Do not intercept mutations or REST API calls
  if (event.request.url.includes("/api/") || event.request.method !== "GET") {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then((response) => {
        // Cache new static requests on the fly
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // Offline fallback for browser page refreshes (routing)
        if (event.request.mode === "navigate") {
          return caches.match("/index.html");
        }
      });
    })
  );
});
