const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHash, randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { after, before, describe, it } = require('node:test');
const { Client, Pool } = require('pg');
const { courses, users } = require('../../db/demo-classroom');
const { createApp } = require('../app');
const { createEmbeddingProvider } = require('../embedding-provider');
const { processNextJob } = require('../ingestion');

const adminUrl = process.env.CLASSLYAI_TEST_DATABASE_URL;

describe('ClasslyAI API on PostgreSQL', { skip: !adminUrl }, () => {
    const database = `classlyai_test_${randomBytes(8).toString('hex')}`;
    const passwords = Object.fromEntries(users.map(user => [user.passwordVariable, randomBytes(18).toString('hex')]));
    const origin = 'https://classlyai.example';
    let admin;
    let createdDatabase = false;
    let pool;
    let server;
    let base;

    before(async () => {
        process.env.CLASSLYAI_AI_MODE = 'fixture';
        const url = new URL(adminUrl);
        admin = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
        await admin.connect();
        await admin.query(`CREATE DATABASE ${database}`);
        createdDatabase = true;
        url.pathname = `/${database}`;
        url.searchParams.delete('database');
        const connectionString = url.toString();
        const env = { ...process.env, ...passwords, NODE_ENV: 'test', DATABASE_URL: connectionString, DATABASE_URL_DIRECT: connectionString };
        for (const script of ['migrate.js', 'seed.js']) {
            execFileSync(process.execPath, [join(__dirname, '../../db', script)], { env, timeout: 15_000 });
        }
        pool = new Pool({ connectionString });
        server = createServer(createApp({ pool, origin }));
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        base = `http://127.0.0.1:${server.address().port}`;
    });

    after(async () => {
        try {
            if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
            await pool?.end();
        } finally {
            try {
                if (createdDatabase) await admin.query(`DROP DATABASE ${database}`);
            } finally {
                await admin?.end();
            }
        }
    });

    async function request(path, status, { cookie, body, requestOrigin = origin, method = body ? 'POST' : 'GET' } = {}) {
        const response = await fetch(base + path, {
            method,
            headers: { origin: requestOrigin, ...(cookie && { cookie }), ...(body && { 'content-type': 'application/json' }) },
            body: body && JSON.stringify(body)
        });
        assert.equal(response.status, status, `${method} ${path}`);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        return { cookie: response.headers.get('set-cookie'), data: status === 204 ? null : await response.json() };
    }

    async function login(user, options) {
        const { cookie, data } = await request('/api/auth/login', 200, {
            body: { email: user.email, password: passwords[user.passwordVariable] },
            ...options
        });
        assert.match(cookie, /^__Host-classlyai-session=/);
        assert.match(cookie, /HttpOnly/);
        assert.match(cookie, /SameSite=Lax/);
        assert.match(cookie, /; Secure/);
        assert.equal(data.user.id, user.id);
        return cookie.split(';')[0];
    }

    it('checks origin, hashes tokens, rotates sessions, and revokes on logout', async () => {
        const user = users[1];
        await request('/api/auth/me', 401);
        await request('/api/auth/login', 403, {
            body: { email: user.email, password: passwords[user.passwordVariable] }, requestOrigin: 'https://other.example'
        });
        const original = await login(user);
        const checksum = createHash('sha256').update(original.slice(original.indexOf('=') + 1)).digest('hex');
        const { rows } = await pool.query('SELECT token_hash FROM classlyai.sessions WHERE user_id = $1', [user.id]);
        assert.deepEqual(rows, [{ token_hash: checksum }]);
        const rotated = await login(user, { cookie: original });
        await request('/api/auth/me', 401, { cookie: original });
        await request('/api/auth/me', 200, { cookie: rotated });
        await request('/api/auth/logout', 204, { cookie: rotated, method: 'POST' });
        await request('/api/auth/me', 401, { cookie: rotated });
    });

    it('resumes an unfinished lesson and preserves completion across concurrent views', async () => {
        const [teacherCookie, studentCookie, otherCookie] = await Promise.all(users.map(user => login(user)));
        const [backend] = courses;
        const coursePath = `/api/courses/${backend.slug}`;
        const lessonPath = `${coursePath}/lessons/${backend.lesson.slug}`;
        const progressPath = `${lessonPath}/progress`;
        const patch = (cookie, body) => ({ cookie, body, method: 'PATCH' });
        const readCourses = async () => (await request('/api/courses', 200, { cookie: studentCookie })).data.courses;

        assert.equal((await readCourses())[0].resume, null);
        await request(progressPath, 404, patch(otherCookie, {}));
        await request(progressPath, 404, patch(teacherCookie, {}));
        await request(progressPath, 400, patch(studentCookie, { completed: 'true' }));
        await request(progressPath, 200, patch(studentCookie, {}));
        assert.equal((await readCourses())[0].resume.lessonSlug, backend.lesson.slug);

        await Promise.all([
            request(progressPath, 200, patch(studentCookie, { completed: true })),
            request(progressPath, 200, patch(studentCookie, {}))
        ]);
        assert.equal((await readCourses())[0].resume, null);
        assert.equal((await request(lessonPath, 200, { cookie: studentCookie })).data.lesson.completed, true);
        assert.equal((await request(coursePath, 200, { cookie: studentCookie })).data.course.lessons[0].completed, true);

        await request(progressPath, 200, patch(studentCookie, { completed: false }));
        assert.equal((await readCourses())[0].resume.lessonSlug, backend.lesson.slug);
    });

    it('publishes revisions atomically and scopes tutor evidence to active course members', async () => {
        const studentA = users[1];
        const [backend, search] = courses;
        const [teacherCookie, studentCookie, otherCookie] = await Promise.all(users.map(user => login(user)));
        const provider = createEmbeddingProvider();
        for (const _course of courses) assert.equal((await processNextJob(pool, provider)).state, 'ready');
        assert.equal((await processNextJob(pool, provider)).state, 'idle');
        const coursePath = `/api/courses/${backend.slug}`;
        const lessonPath = `${coursePath}/lessons/${backend.lesson.slug}`;
        const ownCourses = (await request('/api/courses', 200, { cookie: studentCookie })).data.courses;
        assert.deepEqual(ownCourses.map(course => course.slug), [backend.slug]);
        await request(`/api/courses/${search.slug}`, 404, { cookie: studentCookie });
        await request(`${lessonPath}/editor`, 404, { cookie: studentCookie });
        await request(lessonPath, 404, { cookie: otherCookie });

        const body = { title: 'Idempotency keys', markdown: '## Duplicate requests\n\nAn idempotency key recognizes duplicate requests. The server stores the first result and returns it for retries.' };
        const [left, right] = await Promise.all([1, 2].map(() => request(`${lessonPath}/draft`, 200, { cookie: teacherCookie, body })));
        const revisionId = left.data.lesson.revisionId;
        assert.equal(right.data.lesson.revisionId, revisionId);
        assert.equal(left.data.lesson.status, 'draft');
        assert.equal((await request(lessonPath, 200, { cookie: studentCookie })).data.lesson.revisionId, backend.lesson.revisionId);
        await request(`${lessonPath}/publish`, 409, { cookie: teacherCookie, body: { revisionId: backend.lesson.revisionId } });
        const publication = { cookie: teacherCookie, body: { revisionId } };
        await request(`${lessonPath}/publish`, 200, publication);
        await request(`${lessonPath}/publish`, 200, publication);
        assert.equal((await processNextJob(pool, provider)).state, 'ready');
        assert.equal((await request(lessonPath, 200, { cookie: studentCookie })).data.lesson.revisionId, revisionId);

        const question = { question: 'What recognizes duplicate requests?' };
        const answer = (await request(`${coursePath}/tutor`, 200, { cookie: studentCookie, body: question })).data;
        assert.equal(answer.status, 'answered');
        assert.ok(answer.citations.length > 0);
        if (process.env.CLASSLYAI_EXPECT_VECTOR_ENGINE) {
            assert.equal(answer.trace.vectorEngine, process.env.CLASSLYAI_EXPECT_VECTOR_ENGINE);
        }
        const citationPath = `${coursePath}/citations/${answer.citations[0].id}`;
        await request(citationPath, 404, { cookie: otherCookie });
        const citation = (await request(citationPath, 200, { cookie: studentCookie })).data.citation;
        assert.equal(citation.markdown.slice(citation.startOffset, citation.endOffset), citation.excerpt);
        const unsupported = (await request(`${coursePath}/tutor`, 200, { cookie: studentCookie, body: { question: 'When do penguins migrate to Antarctica?' } })).data;
        assert.equal(unsupported.status, 'insufficient_evidence');

        await pool.query('UPDATE classlyai.lesson_revisions SET withdrawn_at = now() WHERE id = $1', [revisionId]);
        await request(lessonPath, 404, { cookie: studentCookie });
        await request(`${lessonPath}/progress`, 404, { cookie: studentCookie, method: 'PATCH', body: {} });
        await request(citationPath, 404, { cookie: studentCookie });
        await pool.query('UPDATE classlyai.course_memberships SET revoked_at = now() WHERE course_id = $1 AND user_id = $2', [backend.id, studentA.id]);
        await request(coursePath, 404, { cookie: studentCookie });
        await request(`${coursePath}/tutor`, 404, { cookie: studentCookie, body: question });
        assert.equal((await request('/api/courses', 200, { cookie: otherCookie })).data.courses[0].slug, search.slug);
    });
});
