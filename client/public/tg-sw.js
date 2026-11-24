// Answers <video> Range requests for /tg-stream/<channelId>/<messageId> by asking the page,
// which downloads the bytes straight from Telegram with GramJS.
const MAX = 1024 * 1024;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

const ask = (client, data) => new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = (ev) => resolve(ev.data);
    client.postMessage(data, [ch.port2]);
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    if (!url.pathname.startsWith('/tg-stream/')) return;

    e.respondWith((async () => {
        const client = (e.clientId && await self.clients.get(e.clientId))
            || (await self.clients.matchAll({ type: 'window' }))[0];
        if (!client) return new Response('No page to read from', { status: 503 });

        const [, , channelId, messageId] = url.pathname.split('/');
        const m = /bytes=(\d+)-(\d*)/.exec(e.request.headers.get('range') || 'bytes=0-');
        const start = Number(m[1]);
        const end = m[2] ? Math.min(Number(m[2]), start + MAX - 1) : start + MAX - 1;

        const r = await ask(client, { type: 'tg-range', channelId, messageId: Number(messageId), start, end });
        if (r.error) return new Response(r.error, { status: 502 });
        return new Response(r.buf, {
            status: 206,
            headers: {
                'Content-Type': r.mime,
                'Content-Range': `bytes ${start}-${start + r.buf.byteLength - 1}/${r.size}`,
                'Content-Length': String(r.buf.byteLength),
                'Accept-Ranges': 'bytes',
            },
        });
    })());
});
