const bcrypt = require('bcryptjs');
const { courses, instructorId, users } = require('./demo-classroom');
const { createPostgresPool, describePostgresError } = require('./postgres');

async function readDemoPasswordHashes() {
    const passwords = users.map(({ passwordVariable }) => {
        const password = process.env[passwordVariable];
        if (!password || Array.from(password).length < 12 || bcrypt.truncates(password)) {
            throw new Error(`${passwordVariable} must be at least 12 characters and at most 72 UTF-8 bytes.`);
        }
        return password;
    });

    if (new Set(passwords).size !== passwords.length) {
        throw new Error('Use a different password for each demo account.');
    }

    return Promise.all(passwords.map(password => bcrypt.hash(password, 12)));
}

async function seedClassroom(client, passwordHashes) {
    for (const [index, user] of users.entries()) {
        const { rowCount } = await client.query(`
            INSERT INTO classlyai.users (id, email, display_name, password_hash)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO NOTHING
        `, [user.id, user.email, user.name, passwordHashes[index]]);

        if (rowCount === 0) {
            const { rows } = await client.query('SELECT email FROM classlyai.users WHERE id = $1', [user.id]);
            if (rows[0]?.email !== user.email) {
                throw new Error(`Demo user ID is already assigned to another account: ${user.id}`);
            }
        }
    }

    for (const { id, slug, title, summary, studentId, lesson } of courses) {
        await client.query(`
            INSERT INTO classlyai.courses (id, slug, title, summary)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO NOTHING
        `, [id, slug, title, summary]);

        await client.query(`
            INSERT INTO classlyai.course_memberships (course_id, user_id, role)
            VALUES ($1, $2, 'instructor'), ($1, $3, 'student')
            ON CONFLICT (course_id, user_id) DO NOTHING
        `, [id, instructorId, studentId]);

        const { rowCount } = await client.query(`
            INSERT INTO classlyai.lessons (id, course_id, slug, position)
            VALUES ($1, $2, $3, 1)
            ON CONFLICT (id) DO NOTHING
        `, [lesson.id, id, lesson.slug]);

        if (rowCount === 0) continue;

        await client.query(`
            INSERT INTO classlyai.lesson_revisions (id, lesson_id, revision_number, authored_by, title, markdown, published_at)
            VALUES ($1, $2, 1, $3, $4, $5, now())
        `, [lesson.revisionId, lesson.id, instructorId, lesson.title, lesson.markdown]);

        await client.query(`
            UPDATE classlyai.lessons SET active_revision_id = $1, requested_revision_id = $1 WHERE id = $2
        `, [lesson.revisionId, lesson.id]);
        await client.query('INSERT INTO classlyai.ingestion_jobs (revision_id) VALUES ($1)', [lesson.revisionId]);
    }
}

async function main() {
    const passwordHashes = await readDemoPasswordHashes();
    const pool = createPostgresPool();
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await seedClassroom(client, passwordHashes);
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            throw error;
        } finally {
            client.release();
        }
        console.log('ClasslyAI demo data is ready. Existing demo records were preserved.');
    } finally {
        await pool.end();
    }
}

main().catch(error => {
    console.error(`ClasslyAI seed failed: ${describePostgresError(error)}`);
    process.exitCode = 1;
});
