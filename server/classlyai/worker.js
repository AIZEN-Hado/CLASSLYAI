const { setTimeout: delay } = require('node:timers/promises');
const { createPostgresPool } = require('../db/postgres');
const { createEmbeddingProvider } = require('./embedding-provider');
const { processNextJob, reconcileActiveJobs } = require('./ingestion');

async function main() {
    const args = process.argv.slice(2);
    const once = args.length === 1 && args[0] === '--once';
    if (args.length && !once) throw new Error('Usage: node server/classlyai/worker.js [--once]');

    const pool = createPostgresPool();
    const provider = createEmbeddingProvider();
    const shutdown = new AbortController();
    const stop = () => shutdown.abort();
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    pool.on('error', error => console.error('ClasslyAI indexing connection failed.', error.code ?? error.name));

    try {
        await reconcileActiveJobs(pool, provider.fingerprint);
        let nextReconciliation = Date.now() + 60_000;
        console.log(`ClasslyAI indexing worker ready in ${provider.mode} mode.`);
        while (!shutdown.signal.aborted) {
            if (!once && Date.now() >= nextReconciliation) {
                await reconcileActiveJobs(pool, provider.fingerprint);
                nextReconciliation = Date.now() + 60_000;
            }
            const { state, revisionId } = await processNextJob(pool, provider);
            if (state === 'idle') {
                if (once) break;
                await delay(1000, undefined, { signal: shutdown.signal }).catch(error => {
                    if (!shutdown.signal.aborted) throw error;
                });
            } else {
                console.log(`ClasslyAI indexing ${state} for revision ${revisionId}.`);
            }
        }
    } finally {
        process.off('SIGINT', stop);
        process.off('SIGTERM', stop);
        await pool.end();
    }
}

main().catch(error => {
    console.error('ClasslyAI indexing worker failed.', error.code ?? error.message);
    process.exitCode = 1;
});
