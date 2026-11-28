const { Router } = require('express');
const { courses } = require('../db/demo-classroom');
const { gradeAnswer, question } = require('./short-answer-grader');

const [backendCourse] = courses;
const { lesson } = backendCourse;
const maxLength = 1500;
const unavailable = 'Short-answer practice is unavailable. Reload the lesson.';

function createShortAnswerRouter(pool) {
    const router = Router();
    const path = `/${backendCourse.slug}/lessons/${lesson.slug}/short-answer`;

    async function requireActiveSeedRevision(req, res, next) {
        const result = await pool.query(`
            SELECT 1
            FROM classlyai.lessons AS lesson
            JOIN classlyai.course_memberships AS membership ON membership.course_id = lesson.course_id
                AND membership.user_id = $1 AND membership.role = 'student' AND membership.revoked_at IS NULL
            JOIN classlyai.lesson_revisions AS revision ON revision.id = lesson.active_revision_id
                AND revision.lesson_id = lesson.id
                AND revision.published_at IS NOT NULL AND revision.withdrawn_at IS NULL
            WHERE lesson.course_id = $2 AND lesson.id = $3 AND revision.id = $4
        `, [req.user.id, backendCourse.id, lesson.id, lesson.revisionId]);
        if (!result.rowCount) return res.status(404).json({ message: unavailable });
        next();
    }

    router.get(path, requireActiveSeedRevision, (_req, res) => {
        res.json({ practice: { revisionId: lesson.revisionId, prompt: question, maxLength } });
    });

    router.post(path, requireActiveSeedRevision, (req, res) => {
        const { revisionId, answer } = req.body || {};
        if (revisionId !== lesson.revisionId) return res.status(404).json({ message: unavailable });
        if (typeof answer !== 'string' || answer.length > maxLength || !answer.trim()) {
            return res.status(400).json({ message: `Write an answer of up to ${maxLength} characters.` });
        }
        res.json(gradeAnswer(answer));
    });

    return router;
}

module.exports = { createShortAnswerRouter };
