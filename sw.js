const CACHE = "mind-lab-v11-shell";

// 인터넷이 느려도 위기 안내가 늦게 뜨지 않도록, 이 시간이 지나면 저장본을 먼저 보여 준다.
const NETWORK_WAIT_MS = 3000;

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

  // 인터넷이 되면 최신 파일을 쓰고, 안 되거나 너무 느리면 저장해 둔 파일로 실행한다.
  event.respondWith(new Promise(resolve => {
    let settled = false;

    const finish = response => {
      if (settled) return;
      settled = true;
      resolve(response);
    };

    const fallback = async () => {
      const cached = await caches.match(event.request);

      if (cached) return cached;

      return event.request.mode === "navigate"
        ? (await caches.match("./index.html")) || Response.error()
        : Response.error();
    };

    const wait = setTimeout(async () => {
      const cached = await caches.match(event.request);

      if (cached) finish(cached);
    }, NETWORK_WAIT_MS);

    fetch(event.request)
      .then(response => {
        clearTimeout(wait);

        if (response.ok) {
          const copy = response.clone();

          caches.open(CACHE).then(cache =>
            cache.put(event.request, copy)
          );
        }

        finish(response);
      })
      .catch(async () => {
        clearTimeout(wait);
        finish(await fallback());
      });
  }));
});
