const { Router } = require('express');

const courseColumns = 'course.id, course.slug, course.title, course.summary, membership.role';
const activeMembership = `
    JOIN classlyai.course_memberships AS membership ON membership.course_id = course.id
        AND membership.user_id = $1 AND membership.revoked_at IS NULL
`;
const publishedRevision = `
    JOIN classlyai.lesson_revisions AS revision ON revision.id = lesson.active_revision_id
        AND revision.lesson_id = lesson.id
        AND revision.published_at IS NOT NULL AND revision.withdrawn_at IS NULL
`;

function createCoursesRouter(pool) {
    const router = Router();

    for (const parameter of ['courseSlug', 'lessonSlug']) {
        router.param(parameter, (_req, res, next, slug) => {
            if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
                return res.status(404).json({ message: 'Resource not found.' });
            }
            next();
        });
    }

    router.get('/', async (req, res) => {
        const { rows: courses } = await pool.query(`
            SELECT ${courseColumns}
            FROM classlyai.courses AS course
            ${activeMembership}
            ORDER BY course.title, course.slug
        `, [req.user.id]);

        res.json({ courses });
    });

    router.get('/:courseSlug', async (req, res) => {
        const { rows: [course] } = await pool.query(`
            SELECT ${courseColumns}, COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', lesson.id, 'slug', lesson.slug, 'title', revision.title
                ) ORDER BY lesson.position)
                FROM classlyai.lessons AS lesson
                ${publishedRevision}
                WHERE lesson.course_id = course.id
            ), '[]'::jsonb) AS lessons
            FROM classlyai.courses AS course
            ${activeMembership}
            WHERE course.slug = $2
        `, [req.user.id, req.params.courseSlug]);

        if (!course) return res.status(404).json({ message: 'Course not found.' });
        res.json({ course });
    });

    router.get('/:courseSlug/lessons/:lessonSlug', async (req, res) => {
        const { rows: [lesson] } = await pool.query(`
            SELECT lesson.id, lesson.slug, revision.title, revision.markdown, revision.id AS "revisionId"
            FROM classlyai.courses AS course
            ${activeMembership}
            JOIN classlyai.lessons AS lesson ON lesson.course_id = course.id
            ${publishedRevision}
            WHERE course.slug = $2 AND lesson.slug = $3
        `, [req.user.id, req.params.courseSlug, req.params.lessonSlug]);

        if (!lesson) return res.status(404).json({ message: 'Lesson not found.' });
        res.json({ lesson });
    });

    router.get('/:courseSlug/instructor', async (req, res) => {
        const { rows: [course] } = await pool.query(`
            SELECT ${courseColumns}, COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', lesson.id, 'slug', lesson.slug, 'title', latest.title,
                    'activeRevisionId', lesson.active_revision_id, 'latestRevisionId', latest.id
                ) ORDER BY lesson.position)
                FROM classlyai.lessons AS lesson
                LEFT JOIN LATERAL (
                    SELECT id, title FROM classlyai.lesson_revisions
                    WHERE lesson_id = lesson.id ORDER BY revision_number DESC LIMIT 1
                ) AS latest ON true
                WHERE lesson.course_id = course.id
            ), '[]'::jsonb) AS lessons
            FROM classlyai.courses AS course
            ${activeMembership}
            WHERE course.slug = $2 AND membership.role = 'instructor'
        `, [req.user.id, req.params.courseSlug]);

        if (!course) return res.status(404).json({ message: 'Course not found.' });
        res.json({ course });
    });

    return router;
}

module.exports = { createCoursesRouter };
