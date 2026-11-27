const { Client, Pool } = require('pg');

function connectionOptions(name, applicationName) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required.`);
    }

    let url;
    try {
        url = new URL(value);
    } catch {
        throw new Error(`${name} must be a PostgreSQL connection URL.`);
    }

    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname.length < 2) {
        throw new Error(`${name} must specify a PostgreSQL host and database.`);
    }

    const host = url.hostname.toLowerCase();
    if (name === 'DATABASE_URL_DIRECT' && host.split('.')[0].endsWith('-pooler')) {
        throw new Error('DATABASE_URL_DIRECT must use the direct endpoint. Turn off connection pooling in Neon’s Connect dialog.');
    }

    if (process.env.NODE_ENV === 'production' || host.endsWith('.neon.tech')) {
        url.searchParams.set('sslmode', 'verify-full');
    }

    return {
        connectionString: url.toString(),
        application_name: applicationName,
        connectionTimeoutMillis: 5_000,
        enableChannelBinding: true
    };
}

function createPostgresPool() {
    return new Pool({ ...connectionOptions('DATABASE_URL', 'classlyai'), max: 5 });
}

function createMigrationClient() {
    return new Client(connectionOptions('DATABASE_URL_DIRECT', 'classlyai-migrate'));
}

module.exports = { createPostgresPool, createMigrationClient };
