const { createHash } = require('node:crypto');
const { readdir, readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { createMigrationClient, describePostgresError } = require('./postgres');

const migrationsDirectory = join(__dirname, 'migrations');

async function readMigrations() {
    const names = (await readdir(migrationsDirectory)).filter(name => name.endsWith('.sql')).sort();
    return Promise.all(names.map(async name => {
        if (!/^\d{3}_[a-z0-9_]+\.sql$/.test(name)) {
            throw new Error(`Invalid migration filename: ${name}`);
        }

        const sql = await readFile(join(migrationsDirectory, name), 'utf8');
        return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
    }));
}

async function applyMigrations(client, migrations) {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    try {
        await client.query("SET LOCAL lock_timeout = '10s'");
        await client.query("SELECT pg_advisory_xact_lock(hashtext('classlyai.schema_migrations'))");
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.classlyai_schema_migrations (
                name text PRIMARY KEY,
                checksum text NOT NULL,
                applied_at timestamptz NOT NULL DEFAULT now()
            )
        `);

        const { rows: applied } = await client.query(`
            SELECT name, checksum
            FROM public.classlyai_schema_migrations
            ORDER BY name COLLATE "C"
        `);

        for (const [index, previous] of applied.entries()) {
            const current = migrations[index];
            if (!current || current.name !== previous.name || current.checksum !== previous.checksum) {
                throw new Error(`Migration history differs at ${previous.name}. Restore the applied migration and add a new file for changes.`);
            }
        }

        const pending = migrations.slice(applied.length);
        for (const { name, sql, checksum } of pending) {
            try {
                await client.query(sql);
            } catch (error) {
                throw new Error(`Migration ${name} failed: ${error.message}`);
            }
            await client.query(
                'INSERT INTO public.classlyai_schema_migrations (name, checksum) VALUES ($1, $2)',
                [name, checksum]
            );
        }

        await client.query('COMMIT');
        return pending.length;
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    }
}

async function main() {
    const migrations = await readMigrations();
    const client = createMigrationClient();
    try {
        await client.connect();
        const count = await applyMigrations(client, migrations);
        console.log(`Applied ${count} ClasslyAI migration(s).`);
    } finally {
        await client.end();
    }
}

main().catch(error => {
    console.error(`ClasslyAI migration failed: ${describePostgresError(error)}`);
    process.exitCode = 1;
});
