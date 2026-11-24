// Plays videos from a private Telegram channel directly in the browser (no server bandwidth).
// GramJS downloads byte ranges; public/tg-sw.js hands them to the <video> element.
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import bigInt from 'big-integer';

const CHUNK = 512 * 1024; // must divide 1 MB and be a multiple of 4 KB
const DC_HOST = ['pluto', 'venus', 'aurora', 'vesta', 'flora'];
const hashes = new Map(); // channelId -> access hash
const docs = new Map();
let clientPromise;
let swReady;

const getClient = (cfg) => {
    if (!clientPromise) {
        clientPromise = (async () => {
            const session = new StringSession(cfg.session);
            // Browsers need Telegram's TLS web hostnames, not the raw DC IP a Node session stores
            session.setDC(session.dcId, `${DC_HOST[session.dcId - 1]}.web.telegram.org`, 443);
            const client = new TelegramClient(session, cfg.apiId, cfg.apiHash, { connectionRetries: 5, useWSS: true });
            client.setLogLevel('error');
            await client.connect();
            return client;
        })().catch((err) => { clientPromise = null; throw err; });
    }
    return clientPromise;
};

const getDocument = async (client, channelId, messageId) => {
    const key = `${channelId}/${messageId}`;
    if (docs.has(key)) return docs.get(key);
    const res = await client.invoke(new Api.channels.GetMessages({
        channel: new Api.InputChannel({ channelId: bigInt(channelId), accessHash: bigInt(hashes.get(channelId)) }),
        id: [new Api.InputMessageID({ id: messageId })],
    }));
    const doc = res.messages[0]?.media?.document;
    if (!doc) throw new Error('Video not found in channel');
    docs.set(key, doc);
    return doc;
};

const readRange = async (client, doc, start, end) => {
    const aligned = start - (start % CHUNK);
    const parts = [];
    let pos = aligned;
    for await (const chunk of client.iterDownload({
        file: new Api.InputDocumentFileLocation({
            id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, thumbSize: '',
        }),
        offset: bigInt(aligned),
        requestSize: CHUNK,
        limit: Math.ceil((end + 1 - aligned) / CHUNK),
        fileSize: bigInt(doc.size),
        dcId: doc.dcId,
    })) {
        parts.push(chunk.subarray(Math.max(start - pos, 0), Math.min(chunk.length, end + 1 - pos)));
        pos += chunk.length;
        if (pos > end) break;
    }
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out.buffer;
};

const onWorkerMessage = async (ev) => {
    if (ev.data?.type !== 'tg-range') return;
    const { channelId, messageId, start, end } = ev.data;
    try {
        const client = await clientPromise;
        const doc = await getDocument(client, channelId, messageId);
        const size = Number(doc.size);
        const buf = await readRange(client, doc, start, Math.min(end, size - 1));
        ev.ports[0].postMessage({ buf, size, mime: doc.mimeType || 'video/mp4' }, [buf]);
    } catch (err) {
        ev.ports[0].postMessage({ error: String(err?.message || err) });
    }
};

const ensureWorker = () => {
    if (!swReady) {
        swReady = (async () => {
            if (!('serviceWorker' in navigator)) throw new Error('This browser cannot play Telegram videos');
            navigator.serviceWorker.addEventListener('message', onWorkerMessage);
            await navigator.serviceWorker.register('/tg-sw.js');
            await navigator.serviceWorker.ready;
            if (!navigator.serviceWorker.controller) {
                await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
            }
        })().catch((err) => { swReady = null; throw err; });
    }
    return swReady;
};

// cfg comes from GET /api/courses/lectures/:id/telegram; returns a src for <video>
export const prepareTelegramVideo = async (cfg) => {
    hashes.set(cfg.channelId, cfg.accessHash);
    await Promise.all([ensureWorker(), getClient(cfg)]);
    return `/tg-stream/${cfg.channelId}/${cfg.messageId}`;
};
