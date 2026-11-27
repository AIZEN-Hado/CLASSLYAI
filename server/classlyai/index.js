const { once } = require('node:events');
const { createServer } = require('node:http');
const { createPostgresPool } = require('../db/postgres');
const { createApp } = require('./app');

function readConfig() {
    const production = process.env.NODE_ENV === 'production';
    const port = Number(process.env.CLASSLYAI_PORT || process.env.PORT || 5001);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('CLASSLYAI_PORT must be an integer between 1 and 65535.');
    }

    let url;
    const value = process.env.CLASSLYAI_ORIGIN || (production ? '' : `http://localhost:${port}`);
    try {
        url = new URL(value);
    } catch {
        throw new Error('CLASSLYAI_ORIGIN must be the public origin of the app.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
        throw new Error('CLASSLYAI_ORIGIN must be an HTTP origin with no path or credentials.');
    }
    if (production && url.protocol !== 'https:') {
        throw new Error('CLASSLYAI_ORIGIN must use HTTPS in production.');
    }

    return { host: production ? '0.0.0.0' : '127.0.0.1', port, origin: url.origin };
}

async function main() {
    const { host, port, origin } = readConfig();
    const pool = createPostgresPool();
    pool.on('error', error => console.error('ClasslyAI PostgreSQL connection failed.', error.code ?? error.name));
    const server = createServer(createApp({ pool, origin }));

    try {
        await pool.query('SELECT 1 FROM classlyai.users LIMIT 1');
        server.listen(port, host);
        await once(server, 'listening');
    } catch (error) {
        await pool.end();
        throw error;
    }

    function shutdown() {
        process.off('SIGINT', shutdown);
        process.off('SIGTERM', shutdown);
        server.close(() => {
            pool.end().catch(() => {
                console.error('ClasslyAI PostgreSQL pool could not close.');
                process.exitCode = 1;
            });
        });
    }

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    console.log(`ClasslyAI API is listening on port ${port}.`);
}

main().catch(error => {
    console.error(`ClasslyAI API could not start: ${error.message}`);
    process.exitCode = 1;
});
