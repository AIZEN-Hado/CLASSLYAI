const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHash, randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { after, before, describe, it } = require('node:test');
const { Client, Pool } = require('pg');
const { PDFParse } = require('pdf-parse');
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

    async function readQuizPdf(path, cookie, filename) {
        const response = await fetch(base + path, { headers: { cookie } });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('content-type'), 'application/pdf');
        assert.equal(response.headers.get('content-disposition'), `attachment; filename="${filename}"`);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        const data = await response.arrayBuffer();
        const parser = new PDFParse({ data: new Uint8Array(data) });
        try {
            return (await parser.getText()).text;
        } finally {
            await parser.destroy();
        }
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

    it('grades revision-scoped student practice and exports the latest multiple-choice result as a private PDF', async () => {
        const [teacherCookie, studentCookie, otherCookie] = await Promise.all(users.map(user => login(user)));
        const [backend, search] = courses;
        const lessonPath = `/api/courses/${backend.slug}/lessons/${backend.lesson.slug}`;
        const quizPath = `${lessonPath}/quiz`;
        const shortAnswerPath = `${lessonPath}/short-answer`;
        const revisionId = backend.lesson.revisionId;
        const resultPath = `${quizPath}/result.pdf?revisionId=${revisionId}`;
        const filename = `${backend.lesson.slug}-quiz-result.pdf`;
        const correctAnswers = { revisionId, answers: [0, 1] };
        const shortAnswer = { revisionId, answer: 'Reuse the original idempotency key and return the saved response without performing another purchase.' };
        const readQuiz = async cookie => (await request(lessonPath, 200, { cookie })).data.lesson.quiz;

        assert.equal(await readQuiz(teacherCookie), null);
        const quiz = await readQuiz(studentCookie);
        assert.equal(quiz.score, null);
        assert.equal(quiz.questions.length, 2);
        for (const question of quiz.questions) {
            assert.deepEqual(Object.keys(question).sort(), ['options', 'prompt']);
            assert.equal(typeof question.prompt, 'string');
            assert.ok(question.options.length >= 2);
            assert.ok(question.options.every(option => typeof option === 'string'));
        }

        await request(quizPath, 401, { body: correctAnswers });
        await request(quizPath, 404, { cookie: teacherCookie, body: correctAnswers });
        await request(quizPath, 404, { cookie: otherCookie, body: correctAnswers });
        await request(resultPath, 404, { cookie: studentCookie });
        for (const answers of [[0], [0, 1, 0], [0, '1'], [0, quiz.questions[1].options.length]]) {
            await request(quizPath, 400, { cookie: studentCookie, body: { revisionId, answers } });
        }
        assert.equal((await readQuiz(studentCookie)).score, null);

        const studentId = users[1].id;
        await pool.query(`
            INSERT INTO classlyai.quiz_results (course_id, student_id, lesson_id, revision_id, score)
            VALUES ($1, $2, $3, $4, 0)
        `, [backend.id, studentId, backend.lesson.id, revisionId]);
        assert.equal((await readQuiz(studentCookie)).score, 0);
        const legacy = await readQuizPdf(resultPath, studentCookie, filename);
        assert.match(legacy, /Score: 0 of 2/);
        assert.match(legacy, /Answer details and submission date are unavailable/);
        assert.doesNotMatch(legacy, /Correct answer:|Submitted:/);

        const partial = await request(quizPath, 200, { cookie: studentCookie, body: { revisionId, answers: [0, 0] } });
        assert.deepEqual(partial.data, { score: 1, feedback: [true, false] });
        assert.equal((await readQuiz(studentCookie)).score, 1);
        const partialPdf = await readQuizPdf(resultPath, studentCookie, filename);
        assert.ok(partialPdf.includes(backend.title) && partialPdf.includes(backend.lesson.title));
        assert.ok(partialPdf.includes(`Student: ${users[1].name}`));
        assert.match(partialPdf, /Submitted: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC/);
        assert.match(partialPdf, /Score: 1 of 2/);
        assert.match(partialPdf, /Your answer: Create a new purchase ID\. \(Incorrect\)/);
        assert.match(partialPdf, /Correct answer: Reuse the original idempotency key\./);

        await request(shortAnswerPath, 401);
        await request(shortAnswerPath, 401, { body: shortAnswer });
        for (const cookie of [teacherCookie, otherCookie]) {
            await request(shortAnswerPath, 404, { cookie });
            await request(shortAnswerPath, 404, { cookie, body: shortAnswer });
        }
        await request(`/api/courses/${search.slug}/lessons/${search.lesson.slug}/short-answer`, 404, { cookie: otherCookie });
        const { data: { practice } } = await request(shortAnswerPath, 200, { cookie: studentCookie });
        assert.deepEqual(Object.keys(practice).sort(), ['maxLength', 'prompt', 'revisionId']);
        assert.equal(practice.revisionId, revisionId);
        for (const answer of ['   ', 'x'.repeat(practice.maxLength + 1), [shortAnswer.answer]]) {
            await request(shortAnswerPath, 400, { cookie: studentCookie, body: { revisionId, answer } });
        }
        await request(shortAnswerPath, 404, { cookie: studentCookie, body: { ...shortAnswer, revisionId: search.lesson.revisionId } });
        const { data: rubric } = await request(shortAnswerPath, 200, { cookie: studentCookie, body: shortAnswer });
        assert.equal(rubric.score, 2);
        assert.equal(rubric.maxScore, 2);
        assert.deepEqual(rubric.points.map(({ id, awarded }) => ({ id, awarded })), [
            { id: 'reuse-key', awarded: true }, { id: 'replay-result', awarded: true }
        ]);
        assert.ok(rubric.points.every(point => Object.keys(point).sort().join(',') === 'awarded,description,id'));
        assert.equal((await readQuiz(studentCookie)).score, 1);

        await request(resultPath, 401);
        await request(resultPath, 404, { cookie: teacherCookie });
        await request(resultPath, 404, { cookie: otherCookie });
        await request(`${quizPath}/result.pdf?revisionId=invalid`, 404, { cookie: studentCookie });

        const otherMembership = [backend.id, users[2].id];
        await pool.query("INSERT INTO classlyai.course_memberships (course_id, user_id, role) VALUES ($1, $2, 'student')", otherMembership);
        try {
            await request(resultPath, 404, { cookie: otherCookie });
        } finally {
            await pool.query('DELETE FROM classlyai.course_memberships WHERE course_id = $1 AND user_id = $2', otherMembership);
        }

        const retake = await request(quizPath, 200, { cookie: studentCookie, body: correctAnswers });
        assert.deepEqual(retake.data, { score: 2, feedback: [true, true] });
        const newSession = await login(users[1]);
        assert.equal((await readQuiz(newSession)).score, 2);
        const retakePdf = await readQuizPdf(resultPath, newSession, filename);
        assert.match(retakePdf, /Score: 2 of 2/);
        assert.match(retakePdf, /Your answer: Reuse the original idempotency key\. \(Correct\)/);
        assert.doesNotMatch(retakePdf, /\(Incorrect\)|Create a new purchase ID/);

        await pool.query('UPDATE classlyai.lesson_revisions SET withdrawn_at = now() WHERE id = $1', [revisionId]);
        try {
            await request(quizPath, 404, { cookie: newSession, body: correctAnswers });
            await request(resultPath, 404, { cookie: newSession });
            await request(shortAnswerPath, 404, { cookie: newSession });
            await request(shortAnswerPath, 404, { cookie: newSession, body: shortAnswer });
        } finally {
            await pool.query('UPDATE classlyai.lesson_revisions SET withdrawn_at = NULL WHERE id = $1', [revisionId]);
        }
        const membership = [backend.id, studentId];
        const membershipFilter = 'WHERE course_id = $1 AND user_id = $2';
        await pool.query(`UPDATE classlyai.course_memberships SET revoked_at = now() ${membershipFilter}`, membership);
        try {
            await request(quizPath, 404, { cookie: newSession, body: correctAnswers });
            await request(resultPath, 404, { cookie: newSession });
            await request(shortAnswerPath, 404, { cookie: newSession });
            await request(shortAnswerPath, 404, { cookie: newSession, body: shortAnswer });
        } finally {
            await pool.query(`UPDATE classlyai.course_memberships SET revoked_at = NULL ${membershipFilter}`, membership);
        }
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
        const publishedLesson = (await request(lessonPath, 200, { cookie: studentCookie })).data.lesson;
        assert.equal(publishedLesson.revisionId, revisionId);
        assert.equal(publishedLesson.quiz, null);
        const quizPath = `${lessonPath}/quiz`;
        const staleQuizBody = { revisionId: backend.lesson.revisionId, answers: [0, 1] };
        await request(quizPath, 404, { cookie: studentCookie, body: staleQuizBody });
        await request(`${lessonPath}/short-answer`, 404, { cookie: studentCookie });
        await request(`${lessonPath}/short-answer`, 404, {
            cookie: studentCookie,
            body: { revisionId: backend.lesson.revisionId, answer: 'Reuse the original key.' }
        });
        await request(`${quizPath}/result.pdf?revisionId=${staleQuizBody.revisionId}`, 404, { cookie: studentCookie });

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
