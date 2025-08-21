const VERSION = "b737-guide-v1.3"; // bump this when you change cache list
const APP_SHELL = [
	"./",
	"./index.html",
	"./app.css",
	"./app.js",
	"./manifest.webmanifest",
	"./icons/icon-192.png",
	"./icons/icon-512.png",
	// Catalog + packs (optional pre-cache)
	"./data/catalog.json",
	"./data/aircraft-general.json",
	"./data/anti-ice.json",
	"./data/electrical.json",
];

self.addEventListener("install", (e) => {
	e.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP_SHELL)));
});

self.addEventListener("activate", (e) => {
	e.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))
				)
			)
	);
});

/* Cache-first; also handle audio Range requests for offline scrubbing */
self.addEventListener("fetch", (e) => {
	const req = e.request;
	if (req.method !== "GET") return;

	const range = req.headers.get("range");
	if (range) {
		e.respondWith(
			(async () => {
				const cache = await caches.open(VERSION);
				let res = await cache.match(req.url);
				if (!res) {
					try {
						res = await fetch(req);
						cache.put(req.url, res.clone());
					} catch {
						/* fall through */
					}
				}
				if (!res) return new Response(null, { status: 404 });

				const buf = await res.arrayBuffer();
				const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
				const start = parseInt(startStr, 10);
				const end = endStr ? parseInt(endStr, 10) : buf.byteLength - 1;
				const chunk = buf.slice(start, end + 1);
				return new Response(chunk, {
					status: 206,
					headers: {
						"Content-Range": `bytes ${start}-${end}/${buf.byteLength}`,
						"Accept-Ranges": "bytes",
						"Content-Length": String(chunk.byteLength),
						"Content-Type": res.headers.get("Content-Type") || "audio/mpeg",
					},
				});
			})()
		);
		return;
	}

	e.respondWith(
		caches.match(req).then(
			(cached) =>
				cached ||
				fetch(req)
					.then((r) => {
						const copy = r.clone();
						caches.open(VERSION).then((c) => c.put(req, copy));
						return r;
					})
					.catch(() => caches.match("./index.html"))
		)
	);
});
