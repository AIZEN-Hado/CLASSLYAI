const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');
const { checkAnswer } = require('./ml/checker');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = res => res.status(404).json({ message: 'Assignment not found.' });

function validateAssignment(body) {
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const points = Array.isArray(body?.points) ? body.points.map(point => (typeof point === 'string' ? point.trim() : '')) : [];
    if (!title || title.length > 160 || !prompt || prompt.length > 2000) return null;
    if (points.length < 1 || points.length > 6 || points.some(point => !point || point.length > 300)) return null;
    if ([title, prompt, ...points].some(text => text.includes('\0'))) return null;
    return { title, prompt, points };
}

function createAssignmentsRouter(pool) {
    const router = Router();
    const submitLimit = rateLimit({
        windowMs: 60_000, limit: 6, keyGenerator: req => req.user.id, standardHeaders: 'draft-8', legacyHeaders: false,
        message: { message: 'You have submitted several times in a minute. Wait a moment and try again.' },
    });

    router.param('courseSlug', (_req, res, next, slug) => {
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return res.status(404).json({ message: 'Course not found.' });
        next();
    });
    for (const parameter of ['assignmentId', 'submissionId']) {
        router.param(parameter, (_req, res, next, id) => (uuidPattern.test(id) ? next() : notFound(res)));
    }

    async function membership(req, res, next) {
        const { rows: [row] } = await pool.query(`
            SELECT course.id AS "courseId", membership.role
            FROM classlyai.courses AS course
            JOIN classlyai.course_memberships AS membership ON membership.course_id = course.id
                AND membership.user_id = $1 AND membership.revoked_at IS NULL
            WHERE course.slug = $2
        `, [req.user.id, req.params.courseSlug]);
        if (!row) return res.status(404).json({ message: 'Course not found.' });
        req.course = row;
        next();
    }
    const instructorOnly = (req, res, next) => (req.course.role === 'instructor' ? next() : res.status(403).json({ message: 'Only instructors can do that.' }));
    const studentOnly = (req, res, next) => (req.course.role === 'student' ? next() : res.status(403).json({ message: 'Only students can submit.' }));

    async function loadAssignment(courseId, assignmentId) {
        const { rows: [assignment] } = await pool.query(`
            SELECT assignment.id, assignment.title, assignment.prompt,
                COALESCE((SELECT jsonb_agg(point.description ORDER BY point.ordinal) FROM classlyai.assignment_points AS point WHERE point.assignment_id = assignment.id), '[]'::jsonb) AS points
            FROM classlyai.assignments AS assignment WHERE assignment.id = $1 AND assignment.course_id = $2
        `, [assignmentId, courseId]);
        return assignment;
    }

    // Students see the model's marks as advisory until an instructor reviews them.
    function studentView(submission, points) {
        if (!submission) return null;
        const reviewed = Boolean(submission.reviewedAt);
        return {
            answer: submission.answer, submittedAt: submission.submittedAt, reviewed,
            marks: points.map((description, index) => {
                const mark = submission.marks.find(item => item.ordinal === index + 1);
                return { description, awarded: reviewed ? mark.final_awarded : mark.auto_awarded };
            }),
        };
    }

    const submissionsSql = `
        SELECT submission.id, submission.student_id AS "studentId", student.display_name AS "studentName", submission.answer,
            submission.submitted_at AS "submittedAt", submission.reviewed_at AS "reviewedAt",
            COALESCE((SELECT jsonb_agg(jsonb_build_object('ordinal', mark.ordinal, 'auto_awarded', mark.auto_awarded, 'encoderScore', mark.encoder_score,
                'flagged', mark.flagged, 'final_awarded', mark.final_awarded) ORDER BY mark.ordinal)
                FROM classlyai.submission_marks AS mark WHERE mark.submission_id = submission.id), '[]'::jsonb) AS marks
        FROM classlyai.submissions AS submission JOIN classlyai.users AS student ON student.id = submission.student_id
    `;

    router.get('/:courseSlug/assignments', membership, async (req, res) => {
        const { rows } = await pool.query(`
            SELECT assignment.id, assignment.title, assignment.created_at AS "createdAt",
                (SELECT count(*)::int FROM classlyai.assignment_points AS point WHERE point.assignment_id = assignment.id) AS "pointCount",
                (SELECT count(*)::int FROM classlyai.submissions AS submission WHERE submission.assignment_id = assignment.id) AS "submissionCount",
                (SELECT count(*)::int FROM classlyai.submissions AS submission WHERE submission.assignment_id = assignment.id AND submission.reviewed_at IS NULL) AS "needsReview",
                own.id IS NOT NULL AS submitted, own.reviewed_at IS NOT NULL AS reviewed,
                (SELECT count(*)::int FROM classlyai.submission_marks AS mark WHERE mark.submission_id = own.id
                    AND CASE WHEN own.reviewed_at IS NOT NULL THEN mark.final_awarded ELSE mark.auto_awarded END) AS score
            FROM classlyai.assignments AS assignment
            LEFT JOIN classlyai.submissions AS own ON own.assignment_id = assignment.id AND own.student_id = $2
            WHERE assignment.course_id = $1 ORDER BY assignment.created_at DESC
        `, [req.course.courseId, req.user.id]);
        res.json({ role: req.course.role, assignments: rows.map(row => (req.course.role === 'instructor'
            ? { id: row.id, title: row.title, createdAt: row.createdAt, pointCount: row.pointCount, submissionCount: row.submissionCount, needsReview: row.needsReview }
            : { id: row.id, title: row.title, createdAt: row.createdAt, pointCount: row.pointCount, submitted: row.submitted, reviewed: row.reviewed, score: row.submitted ? row.score : null })) });
    });

    router.post('/:courseSlug/assignments', membership, instructorOnly, async (req, res) => {
        const input = validateAssignment(req.body);
        if (!input) {
            return res.status(400).json({ message: 'Enter a title up to 160 characters, a prompt up to 2,000 characters, and 1 to 6 rubric points of up to 300 characters.' });
        }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { rows: [created] } = await client.query('INSERT INTO classlyai.assignments (course_id, title, prompt, created_by) VALUES ($1, $2, $3, $4) RETURNING id', [req.course.courseId, input.title, input.prompt, req.user.id]);
            for (const [index, description] of input.points.entries()) {
                await client.query('INSERT INTO classlyai.assignment_points (assignment_id, ordinal, description) VALUES ($1, $2, $3)', [created.id, index + 1, description]);
            }
            await client.query('COMMIT');
            res.status(201).json({ assignment: { id: created.id, ...input } });
        } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            throw error;
        } finally {
            client.release();
        }
    });

    router.get('/:courseSlug/assignments/:assignmentId', membership, async (req, res) => {
        const assignment = await loadAssignment(req.course.courseId, req.params.assignmentId);
        if (!assignment) return notFound(res);
        if (req.course.role === 'instructor') {
            const { rows } = await pool.query(`${submissionsSql} WHERE submission.assignment_id = $1 ORDER BY (submission.reviewed_at IS NOT NULL), submission.submitted_at`, [assignment.id]);
            return res.json({ assignment, submissions: rows });
        }
        const { rows: [own] } = await pool.query(`${submissionsSql} WHERE submission.assignment_id = $1 AND submission.student_id = $2`, [assignment.id, req.user.id]);
        res.json({ assignment, submission: studentView(own, assignment.points) });
    });

    router.post('/:courseSlug/assignments/:assignmentId/submit', submitLimit, membership, studentOnly, async (req, res) => {
        const answer = typeof req.body?.answer === 'string' ? req.body.answer.trim() : '';
        if (!answer || answer.length > 2000 || answer.includes('\0')) return res.status(400).json({ message: 'Write an answer of up to 2,000 characters.' });
        const assignment = await loadAssignment(req.course.courseId, req.params.assignmentId);
        if (!assignment) return notFound(res);

        let marks;
        try {
            marks = await checkAnswer(assignment.points, answer);
        } catch (error) {
            console.warn('ClasslyAI answer checker failed.', { type: error.name });
            return res.status(503).json({ message: 'The answer checker is unavailable. Your answer was not submitted; try again in a moment.' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { rows: [submission] } = await client.query(`
                INSERT INTO classlyai.submissions (assignment_id, course_id, student_id, answer)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (assignment_id, student_id) DO UPDATE
                SET answer = EXCLUDED.answer, submitted_at = now(), reviewed_by = NULL, reviewed_at = NULL
                RETURNING id
            `, [assignment.id, req.course.courseId, req.user.id, answer]);
            await client.query('DELETE FROM classlyai.submission_marks WHERE submission_id = $1', [submission.id]);
            for (const [index, mark] of marks.entries()) {
                await client.query('INSERT INTO classlyai.submission_marks (submission_id, ordinal, auto_awarded, encoder_score, flagged) VALUES ($1, $2, $3, $4, $5)', [submission.id, index + 1, mark.awarded, mark.encoderScore, mark.flagged]);
            }
            await client.query('COMMIT');
            const { rows: [own] } = await pool.query(`${submissionsSql} WHERE submission.id = $1`, [submission.id]);
            res.json({ submission: studentView(own, assignment.points) });
        } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            throw error;
        } finally {
            client.release();
        }
    });

    router.put('/:courseSlug/assignments/:assignmentId/submissions/:submissionId/review', membership, instructorOnly, async (req, res) => {
        const assignment = await loadAssignment(req.course.courseId, req.params.assignmentId);
        if (!assignment) return notFound(res);
        const finals = req.body?.marks;
        if (!Array.isArray(finals) || finals.length !== assignment.points.length || !finals.every(value => typeof value === 'boolean')) {
            return res.status(400).json({ message: 'Mark every rubric point as awarded or not awarded.' });
        }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { rowCount } = await client.query(`
                UPDATE classlyai.submissions SET reviewed_by = $1, reviewed_at = now()
                WHERE id = $2 AND assignment_id = $3 AND course_id = $4
            `, [req.user.id, req.params.submissionId, assignment.id, req.course.courseId]);
            if (!rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Submission not found.' }); }
            for (const [index, value] of finals.entries()) {
                await client.query('UPDATE classlyai.submission_marks SET final_awarded = $3 WHERE submission_id = $1 AND ordinal = $2', [req.params.submissionId, index + 1, value]);
            }
            await client.query('COMMIT');
            const { rows: [row] } = await pool.query(`${submissionsSql} WHERE submission.id = $1`, [req.params.submissionId]);
            res.json({ submission: row });
        } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            throw error;
        } finally {
            client.release();
        }
    });

    return router;
}

module.exports = { createAssignmentsRouter, validateAssignment };
