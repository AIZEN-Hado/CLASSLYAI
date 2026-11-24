// Streams videos from a private Telegram channel through a bot that is admin there.
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const bigInt = require('big-integer');

const CHUNK = 512 * 1024; // must divide 1 MB and be a multiple of 4 KB
const DOC_TTL = 30 * 60 * 1000; // file references expire, so refetch periodically
const docs = new Map();
let clientPromise;

const TG_LINK = /t\.me\/c\/(\d+)\/(\d+)/;
const parseTelegramLink = (url) => {
    const m = TG_LINK.exec(url || '');
    return m ? { channelId: m[1], messageId: Number(m[2]) } : null;
};

const getClient = () => {
    if (!clientPromise) {
        clientPromise = (async () => {
            const client = new TelegramClient(new StringSession(''), Number(process.env.TG_API_ID), process.env.TG_API_HASH, { connectionRetries: 5 });
            client.setLogLevel('error');
            await client.start({ botAuthToken: process.env.TG_BOT_TOKEN });
            return client;
        })().catch((err) => { clientPromise = null; throw err; });
    }
    return clientPromise;
};

const getDocument = async (channelId, messageId) => {
    const key = `${channelId}/${messageId}`;
    const hit = docs.get(key);
    if (hit && Date.now() - hit.at < DOC_TTL) return hit.doc;

    // TG_CHANNEL_HASHES="<channelId>:<bot's access hash>,..." (the bot cannot look this up itself)
    const pair = (process.env.TG_CHANNEL_HASHES || '').split(',').find((p) => p.startsWith(`${channelId}:`));
    if (!pair) return null;

    const client = await getClient();
    const res = await client.invoke(new Api.channels.GetMessages({
        channel: new Api.InputChannel({ channelId: bigInt(channelId), accessHash: bigInt(pair.split(':')[1]) }),
        id: [new Api.InputMessageID({ id: messageId })],
    }));
    const doc = res.messages[0]?.media?.document;
    if (!doc) return null;
    docs.set(key, { doc, at: Date.now() });
    return doc;
};

// Pipes bytes [start, end] of the document to res, honouring HTTP Range
const streamDocument = async (doc, req, res) => {
    const size = Number(doc.size);
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    let start = m && m[1] ? Number(m[1]) : 0;
    let end = m && m[2] ? Number(m[2]) : size - 1;
    if (m && !m[1] && m[2]) { start = size - Number(m[2]); end = size - 1; }
    end = Math.min(end, size - 1);
    if (start > end || start >= size) {
        res.status(416).set('Content-Range', `bytes */${size}`).end();
        return;
    }

    res.status(m ? 206 : 200).set({
        'Content-Type': doc.mimeType || 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Cache-Control': 'private, max-age=3600',
        ...(m && { 'Content-Range': `bytes ${start}-${end}/${size}` }),
    });
    if (req.method === 'HEAD') return res.end();

    let closed = false;
    req.on('close', () => { closed = true; });

    const client = await getClient();
    const aligned = start - (start % CHUNK);
    let pos = aligned;
    const iter = client.iterDownload({
        file: new Api.InputDocumentFileLocation({
            id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, thumbSize: '',
        }),
        offset: bigInt(aligned),
        requestSize: CHUNK,
        limit: Math.ceil((end + 1 - aligned) / CHUNK),
        fileSize: bigInt(size),
        dcId: doc.dcId,
    });
    for await (const chunk of iter) {
        if (closed) break;
        const from = Math.max(start - pos, 0);
        const to = Math.min(chunk.length, end + 1 - pos);
        pos += chunk.length;
        if (to > from && !res.write(chunk.subarray(from, to))) {
            await new Promise((r) => res.once('drain', r));
        }
        if (pos > end) break;
    }
    res.end();
};

const isConfigured = () => !!(process.env.TG_API_ID && process.env.TG_API_HASH && process.env.TG_BOT_TOKEN);

module.exports = { parseTelegramLink, getDocument, streamDocument, isConfigured, docs };
