const { createPostgresPool, describePostgresError } = require('./postgres');

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
    console.error(`ClasslyAI PostgreSQL check failed: ${describePostgresError(error)}`);
    process.exitCode = 1;
});
