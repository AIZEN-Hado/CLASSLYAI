const { randomInt } = require('node:crypto');
const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0 or 1
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maxLessons = 50;

const joinCode = () => Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join('');

function slugify(text, fallback) {
    const slug = text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '');
    return slug || fallback;
}

function validateCourse(body) {
    const title = typeof body?.title === 'string' ? body.title.trim().replace(/\s+/g, ' ') : '';
    const summary = typeof body?.summary === 'string' ? body.summary.trim() : '';
    if (!title || title.length > 120 || summary.length > 300 || `${title}${summary}`.includes('\0')) return null;
    return { title, summary };
}

const uniqueViolation = error => error.code === '23505';

function createCourseAdminRouter(pool) {
    const router = Router();
    const createLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, keyGenerator: req => req.user.id, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'You have created several courses recently. Try again later.' } });
    const joinLimit = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, keyGenerator: req => req.user.id, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many attempts. Try again in a few minutes.' } });

    router.param('courseSlug', (_req, res, next, slug) => (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? next() : res.status(404).json({ message: 'Course not found.' })));
    router.param('userId', (_req, res, next, id) => (uuidPattern.test(id) ? next() : res.status(404).json({ message: 'Member not found.' })));

    async function instructorOf(req, res, next) {
        const { rows: [row] } = await pool.query(`
            SELECT course.id AS "courseId", course.title
            FROM classlyai.courses AS course
            JOIN classlyai.course_memberships AS membership ON membership.course_id = course.id
                AND membership.user_id = $1 AND membership.role = 'instructor' AND membership.revoked_at IS NULL
            WHERE course.slug = $2
        `, [req.user.id, req.params.courseSlug]);
        if (!row) return res.status(404).json({ message: 'Course not found.' });
        req.course = row;
        next();
    }

    router.post('/', createLimit, async (req, res) => {
        const input = validateCourse(req.body);
        if (!input) return res.status(400).json({ message: 'Enter a title up to 120 characters and a summary up to 300.' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const base = slugify(input.title, 'course');
            for (let attempt = 0; attempt < 8; attempt++) {
                const slug = attempt === 0 ? base : `${base.slice(0, 43)}-${randomInt(100, 1000)}`;
                await client.query('SAVEPOINT attempt');
                try {
                    const { rows: [course] } = await client.query(`
                        INSERT INTO classlyai.courses (slug, title, summary, join_code) VALUES ($1, $2, $3, $4) RETURNING id, slug, join_code AS "joinCode"
                    `, [slug, input.title, input.summary, joinCode()]);
                    await client.query("INSERT INTO classlyai.course_memberships (course_id, user_id, role) VALUES ($1, $2, 'instructor')", [course.id, req.user.id]);
                    await client.query('COMMIT');
                    return res.status(201).json({ course: { slug: course.slug, title: input.title, summary: input.summary, joinCode: course.joinCode } });
                } catch (error) {
                    if (!uniqueViolation(error)) throw error;
                    await client.query('ROLLBACK TO SAVEPOINT attempt');
                }
            }
            await client.query('ROLLBACK');
            res.status(409).json({ message: 'Try a slightly different title.' });
        } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            throw error;
        } finally {
            client.release();
        }
    });

    router.post('/join', joinLimit, async (req, res) => {
        const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase().replace(/[\s-]/g, '') : '';
        if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) return res.status(400).json({ message: 'Enter the 8-character code from your instructor.' });

        const { rows: [course] } = await pool.query('SELECT id, slug, title FROM classlyai.courses WHERE join_code = $1', [code]);
        if (!course) return res.status(404).json({ message: 'That code does not match a course. Check it with your instructor.' });

        const { rows: [existing] } = await pool.query('SELECT revoked_at FROM classlyai.course_memberships WHERE course_id = $1 AND user_id = $2', [course.id, req.user.id]);
        if (existing?.revoked_at) return res.status(403).json({ message: 'You were removed from this course. Ask the instructor to add you again.' });
        if (!existing) {
            await pool.query("INSERT INTO classlyai.course_memberships (course_id, user_id, role) VALUES ($1, $2, 'student') ON CONFLICT DO NOTHING", [course.id, req.user.id]);
        }
        res.status(existing ? 200 : 201).json({ course: { slug: course.slug, title: course.title }, alreadyMember: Boolean(existing) });
    });

    router.get('/:courseSlug/members', instructorOf, async (req, res) => {
        const { rows: members } = await pool.query(`
            SELECT account.id, account.display_name AS "displayName", account.email, membership.role, membership.created_at AS "joinedAt"
            FROM classlyai.course_memberships AS membership
            JOIN classlyai.users AS account ON account.id = membership.user_id
            WHERE membership.course_id = $1 AND membership.revoked_at IS NULL
            ORDER BY (membership.role = 'instructor') DESC, membership.created_at
        `, [req.course.courseId]);
        const { rows: [{ joinCode: code }] } = await pool.query('SELECT join_code AS "joinCode" FROM classlyai.courses WHERE id = $1', [req.course.courseId]);
        res.json({ joinCode: code, members });
    });

    router.post('/:courseSlug/join-code', instructorOf, async (req, res) => {
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                const { rows: [row] } = await pool.query('UPDATE classlyai.courses SET join_code = $2 WHERE id = $1 RETURNING join_code AS "joinCode"', [req.course.courseId, joinCode()]);
                return res.json({ joinCode: row.joinCode });
            } catch (error) {
                if (!uniqueViolation(error)) throw error;
            }
        }
        res.status(409).json({ message: 'Try again.' });
    });

    router.delete('/:courseSlug/members/:userId', instructorOf, async (req, res) => {
        const { rowCount } = await pool.query(`
            UPDATE classlyai.course_memberships SET revoked_at = now()
            WHERE course_id = $1 AND user_id = $2 AND role = 'student' AND revoked_at IS NULL
        `, [req.course.courseId, req.params.userId]);
        if (!rowCount) return res.status(404).json({ message: 'Student not found in this course.' });
        res.json({ removed: true });
    });

    router.post('/:courseSlug/lessons', instructorOf, async (req, res) => {
        const title = typeof req.body?.title === 'string' ? req.body.title.trim().replace(/\s+/g, ' ') : '';
        if (!title || title.length > 160 || title.includes('\0')) return res.status(400).json({ message: 'Enter a lesson title up to 160 characters.' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('SELECT id FROM classlyai.courses WHERE id = $1 FOR UPDATE', [req.course.courseId]);
            const { rows: [{ count, next }] } = await client.query('SELECT count(*)::int AS count, COALESCE(max(position), 0) + 1 AS next FROM classlyai.lessons WHERE course_id = $1', [req.course.courseId]);
            if (count >= maxLessons) { await client.query('ROLLBACK'); return res.status(409).json({ message: `A course can have up to ${maxLessons} lessons.` }); }
            const { rows: taken } = await client.query('SELECT slug FROM classlyai.lessons WHERE course_id = $1', [req.course.courseId]);
            const used = new Set(taken.map(row => row.slug));
            const base = slugify(title, 'lesson');
            let slug = base;
            for (let suffix = 2; used.has(slug); suffix++) slug = `${base.slice(0, 44)}-${suffix}`;
            const { rows: [lesson] } = await client.query('INSERT INTO classlyai.lessons (course_id, slug, position) VALUES ($1, $2, $3) RETURNING id', [req.course.courseId, slug, next]);
            await client.query(`
                INSERT INTO classlyai.lesson_revisions (lesson_id, revision_number, authored_by, title, markdown) VALUES ($1, 1, $2, $3, $4)
            `, [lesson.id, req.user.id, title, '## Overview\n\nWrite the lesson here. Save a draft, then publish it so students can read it.']);
            await client.query('COMMIT');
            res.status(201).json({ lesson: { slug, title } });
        } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            throw error;
        } finally {
            client.release();
        }
    });

    return router;
}

module.exports = { createCourseAdminRouter, joinCode, slugify, validateCourse };
