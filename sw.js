const CACHE = "mind-lab-v8-shell";

const CORE = [
  "./",
  "./index.html",
  "./styles.css",
  "./sky.js",
  "./rest.js",
  "./guide.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE))
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE)
          .map(k => caches.delete(k))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.origin !== location.origin) return;

  // 인터넷이 되면 항상 최신 파일을 쓰고, 안 되면 저장해 둔 파일로 실행한다.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();

          caches.open(CACHE).then(cache =>
            cache.put(event.request, copy)
          );
        }

        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached => {
          if (cached) return cached;

          return event.request.mode === "navigate"
            ? caches.match("./index.html")
            : Response.error();
        })
      )
  );
});
