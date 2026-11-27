const { createPostgresPool } = require('./postgres');

async function main() {
    const pool = createPostgresPool();
    try {
        await pool.query('SELECT 1');
        console.log('ClasslyAI PostgreSQL connection is ready.');
    } finally {
        await pool.end();
    }
}

main().catch(error => {
    console.error(`ClasslyAI PostgreSQL check failed: ${error.message}`);
    process.exitCode = 1;
});
