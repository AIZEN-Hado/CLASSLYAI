const { Router } = require('express');

const { quizzes } = require('./practice-quizzes');

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
const ownProgress = `
    LEFT JOIN classlyai.lesson_progress AS progress ON progress.course_id = lesson.course_id
        AND progress.lesson_id = lesson.id AND progress.student_id = $1 AND membership.role = 'student'
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
            SELECT ${courseColumns}, reading.resume
            FROM classlyai.courses AS course
            ${activeMembership}
            LEFT JOIN LATERAL (
                SELECT jsonb_build_object('lessonSlug', lesson.slug, 'title', revision.title,
                    'lastViewedAt', progress.last_viewed_at) AS resume
                FROM classlyai.lesson_progress AS progress
                JOIN classlyai.lessons AS lesson ON lesson.id = progress.lesson_id
                ${publishedRevision}
                WHERE progress.course_id = course.id AND progress.student_id = $1
                    AND progress.completed_at IS NULL AND membership.role = 'student'
                ORDER BY progress.last_viewed_at DESC, progress.lesson_id
                LIMIT 1
            ) AS reading ON true
            ORDER BY course.title, course.slug
        `, [req.user.id]);

        res.json({ courses });
    });

    router.get('/:courseSlug', async (req, res) => {
        const { rows: [course] } = await pool.query(`
            SELECT ${courseColumns}, COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', lesson.id, 'slug', lesson.slug, 'title', revision.title,
                    'completed', progress.completed_at IS NOT NULL
                ) ORDER BY lesson.position)
                FROM classlyai.lessons AS lesson
                ${publishedRevision}
                ${ownProgress}
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
            SELECT lesson.id, lesson.slug, revision.title, revision.markdown, revision.id AS "revisionId",
                progress.completed_at IS NOT NULL AS completed, membership.role, result.score
            FROM classlyai.courses AS course
            ${activeMembership}
            JOIN classlyai.lessons AS lesson ON lesson.course_id = course.id
            ${publishedRevision}
            ${ownProgress}
            LEFT JOIN classlyai.quiz_results AS result ON result.revision_id = revision.id AND result.student_id = $1
            WHERE course.slug = $2 AND lesson.slug = $3
        `, [req.user.id, req.params.courseSlug, req.params.lessonSlug]);

        if (!lesson) return res.status(404).json({ message: 'Lesson not found.' });
        const { role, score, ...content } = lesson;
        const questions = role === 'student' && quizzes.get(lesson.revisionId);
        const quiz = questions ? { questions: questions.map(({ prompt, options }) => ({ prompt, options })), score } : null;
        res.json({ lesson: { ...content, quiz } });
    });

    router.post('/:courseSlug/lessons/:lessonSlug/quiz', async (req, res) => {
        const { revisionId, answers } = req.body || {};
        const questions = quizzes.get(revisionId);
        if (!questions) return res.status(404).json({ message: 'Quiz unavailable. Reload the lesson.' });
        if (!Array.isArray(answers) || answers.length !== questions.length ||
            !answers.every((choice, i) => Number.isInteger(choice) && choice >= 0 && choice < questions[i].options.length)) {
            return res.status(400).json({ message: 'Choose one listed answer for each question.' });
        }

        const feedback = questions.map((question, i) => question.correct === answers[i]);
        const score = feedback.filter(Boolean).length;
        const result = await pool.query(`
            WITH authorized AS (
                SELECT course.id AS course_id, lesson.id AS lesson_id, revision.id AS revision_id
                FROM classlyai.courses AS course
                ${activeMembership}
                JOIN classlyai.lessons AS lesson ON lesson.course_id = course.id
                ${publishedRevision}
                WHERE course.slug = $2 AND lesson.slug = $3 AND revision.id = $4 AND membership.role = 'student'
                FOR SHARE OF membership, lesson, revision
            )
            INSERT INTO classlyai.quiz_results (course_id, student_id, lesson_id, revision_id, score)
            SELECT course_id, $1, lesson_id, revision_id, $5 FROM authorized
            ON CONFLICT (student_id, revision_id) DO UPDATE SET score = EXCLUDED.score
        `, [req.user.id, req.params.courseSlug, req.params.lessonSlug, revisionId, score]);
        if (!result.rowCount) return res.status(404).json({ message: 'Quiz unavailable. Reload the lesson.' });
        res.json({ score, feedback });
    });

    router.patch('/:courseSlug/lessons/:lessonSlug/progress', async (req, res) => {
        const completed = req.body?.completed;
        if (completed !== undefined && typeof completed !== 'boolean') {
            return res.status(400).json({ message: 'Completion must be true or false.' });
        }

        const { rows: [progress] } = await pool.query(`
            WITH authorized AS (
                SELECT course.id AS course_id, lesson.id AS lesson_id
                FROM classlyai.courses AS course
                ${activeMembership}
                JOIN classlyai.lessons AS lesson ON lesson.course_id = course.id
                ${publishedRevision}
                WHERE course.slug = $2 AND lesson.slug = $3 AND membership.role = 'student'
                FOR SHARE OF membership
            )
            INSERT INTO classlyai.lesson_progress AS stored (course_id, student_id, lesson_id, completed_at)
            SELECT course_id, $1, lesson_id, CASE WHEN $4::boolean THEN now() END FROM authorized
            ON CONFLICT (course_id, student_id, lesson_id) DO UPDATE
            SET last_viewed_at = GREATEST(stored.last_viewed_at, now()),
                completed_at = CASE $4::boolean
                    WHEN true THEN COALESCE(stored.completed_at, now())
                    WHEN false THEN NULL
                    ELSE stored.completed_at
                END
            RETURNING last_viewed_at AS "lastViewedAt", completed_at IS NOT NULL AS completed
        `, [req.user.id, req.params.courseSlug, req.params.lessonSlug, completed ?? null]);
        if (!progress) return res.status(404).json({ message: 'Lesson not found.' });
        res.json({ progress });
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
