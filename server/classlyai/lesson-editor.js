const { Router } = require('express');

const maxMarkdownBytes = 12_000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const instructorLessonScope = `
    FROM classlyai.courses AS course
    JOIN classlyai.course_memberships AS membership ON membership.course_id = course.id
        AND membership.user_id = $1 AND membership.role = 'instructor' AND membership.revoked_at IS NULL
    JOIN classlyai.lessons AS lesson ON lesson.course_id = course.id
`;

async function readLesson(db, userId, courseSlug, lessonSlug) {
    const { rows: [lesson] } = await db.query(`
        SELECT lesson.id, lesson.slug, latest.title, latest.markdown,
            latest.id AS "revisionId", latest.revision_number AS "revisionNumber",
            lesson.active_revision_id AS "activeRevisionId", lesson.requested_revision_id AS "requestedRevisionId",
            COALESCE(job.state, CASE WHEN latest.id = lesson.active_revision_id THEN 'ready' ELSE 'draft' END) AS status,
            CASE WHEN job.state = 'failed' THEN job.last_error END AS error
        ${instructorLessonScope}
        LEFT JOIN LATERAL (
            SELECT id, title, markdown, revision_number
            FROM classlyai.lesson_revisions WHERE lesson_id = lesson.id
            ORDER BY revision_number DESC LIMIT 1
        ) AS latest ON true
        LEFT JOIN classlyai.ingestion_jobs AS job ON job.revision_id = latest.id
        WHERE course.slug = $2 AND lesson.slug = $3
    `, [userId, courseSlug, lessonSlug]);
    return lesson;
}

function lessonScope(req) {
    return [req.user.id, req.params.courseSlug, req.params.lessonSlug];
}

async function withLesson(pool, req, update) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const scope = lessonScope(req);
        const { rowCount } = await client.query(`
            SELECT lesson.id ${instructorLessonScope}
            WHERE course.slug = $2 AND lesson.slug = $3
            FOR UPDATE OF lesson FOR SHARE OF membership
        `, scope);
        const lesson = rowCount ? await readLesson(client, ...scope) : null;
        const updated = lesson && await update(client, lesson, scope);
        await client.query('COMMIT');
        return updated;
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}

function createLessonEditorRouter(pool) {
    const router = Router();
    const path = '/:courseSlug/lessons/:lessonSlug';
    const notFound = res => res.status(404).json({ message: 'Lesson not found.' });

    for (const parameter of ['courseSlug', 'lessonSlug']) {
        router.param(parameter, (_req, res, next, slug) => {
            if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return notFound(res);
            next();
        });
    }

    router.get(`${path}/editor`, async (req, res) => {
        const lesson = await readLesson(pool, ...lessonScope(req));
        if (!lesson) return notFound(res);
        res.json({ lesson });
    });

    router.post(`${path}/draft`, async (req, res) => {
        const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
        const markdown = req.body?.markdown;
        if (!title || title.length > 160 || title.includes('\0') || typeof markdown !== 'string'
            || !markdown.trim() || markdown.includes('\0') || Buffer.byteLength(markdown) > maxMarkdownBytes) {
            return res.status(400).json({ message: 'Enter a title up to 160 characters and lesson text up to 12 KB.' });
        }

        const lesson = await withLesson(pool, req, async (client, current, scope) => {
            if (current.title === title && current.markdown === markdown) return current;
            await client.query(`
                INSERT INTO classlyai.lesson_revisions (lesson_id, revision_number, authored_by, title, markdown)
                VALUES ($1, $2, $3, $4, $5)
            `, [current.id, (current.revisionNumber ?? 0) + 1, req.user.id, title, markdown]);
            return readLesson(client, ...scope);
        });
        if (!lesson) return notFound(res);
        res.json({ lesson });
    });

    router.post(`${path}/publish`, async (req, res) => {
        const revisionId = req.body?.revisionId;
        if (typeof revisionId !== 'string' || !uuidPattern.test(revisionId)) {
            return res.status(400).json({ message: 'Save a lesson revision before publishing.' });
        }

        const lesson = await withLesson(pool, req, async (client, current, scope) => {
            if (current.revisionId !== revisionId.toLowerCase()) return false;
            if (current.requestedRevisionId === current.revisionId && ['queued', 'processing', 'ready'].includes(current.status)) {
                return current;
            }

            await client.query('UPDATE classlyai.lessons SET requested_revision_id = $1 WHERE id = $2', [current.revisionId, current.id]);
            await client.query(`
                INSERT INTO classlyai.ingestion_jobs (revision_id) VALUES ($1)
                ON CONFLICT (revision_id) DO UPDATE SET state = 'queued', attempts = 0,
                    run_after = now(), lease_until = NULL, lease_token = NULL, last_error = NULL, updated_at = now()
            `, [current.revisionId]);
            return readLesson(client, ...scope);
        });
        if (lesson === false) return res.status(409).json({ message: 'Reload the editor and publish the latest revision.' });
        if (!lesson) return notFound(res);
        res.json({ lesson });
    });

    return router;
}

module.exports = { createLessonEditorRouter };
