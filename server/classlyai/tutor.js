const { randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');
const { createEmbeddingProvider } = require('./embedding-provider');
const { createRetriever, questionTerms } = require('./retrieval');
const { metadata, score } = require('./models/runtime');

const sentenceSegmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
const abstain = () => ({ status: 'insufficient_evidence', claims: [], citations: [] });

function validateAnswer(answer, passages) {
    if (!Array.isArray(answer?.claims)) return null;
    if (answer.status === 'insufficient_evidence') return answer.claims.length === 0 ? abstain() : null;
    if (answer.status !== 'answered' || answer.claims.length < 1 || answer.claims.length > 4) return null;

    const allowed = new Map(passages.map(passage => [passage.id, passage]));
    const citations = new Map();
    const claims = [];

    for (const claim of answer.claims) {
        if (typeof claim?.text !== 'string' || !claim.text.trim() || claim.text.length > 700) return null;
        if (!Array.isArray(claim.evidence) || claim.evidence.length < 1 || claim.evidence.length > 3) return null;
        const citationIds = new Set();
        for (const evidence of claim.evidence) {
            const passage = allowed.get(evidence?.id);
            const quote = evidence?.quote;
            if (!passage || typeof quote !== 'string' || !quote.trim() || quote.length > 600 || !passage.excerpt.includes(quote)) return null;
            citationIds.add(passage.id);
            const { keywordRank, vectorRank, rerankScore, ...citation } = passage;
            citations.set(passage.id, citation);
        }
        claims.push({ text: claim.text.trim(), citationIds: [...citationIds] });
    }

    return { status: 'answered', claims, citations: [...citations.values()] };
}

function fixtureAnswer(question, passages) {
    const terms = questionTerms(question);
    if (!terms.length) return abstain();

    let best;
    for (const passage of passages) {
        const passageTerms = new Set(questionTerms(passage.excerpt));
        const overlap = terms.filter(term => passageTerms.has(term)).length;
        if (overlap < Math.min(2, terms.length) || overlap / terms.length < 0.4) continue;

        for (const { segment } of sentenceSegmenter.segment(passage.excerpt)) {
            const quote = segment.trim().slice(0, 420).trimEnd();
            const sentenceTerms = new Set(questionTerms(quote));
            const sentenceOverlap = terms.filter(term => sentenceTerms.has(term)).length;
            const score = 4 * sentenceOverlap + overlap;
            if (sentenceOverlap > 0 && (!best || score > best.score)) best = { score, quote, id: passage.id };
        }
    }

    if (!best) return abstain();
    return validateAnswer({
        status: 'answered',
        claims: [{ text: best.quote, evidence: [{ id: best.id, quote: best.quote }] }]
    }, passages);
}

// Cross-encoder scores decide the passage order and whether the course supports an answer at all.
async function rerankPassages(question, passages) {
    const [{ threshold }, scores] = await Promise.all([
        metadata('reranker'),
        score('reranker', passages.map(passage => [question, `${passage.section}. ${passage.excerpt}`]))
    ]);
    return passages.map((passage, index) => ({ ...passage, rerankScore: Number(scores[index].toFixed(4)) }))
        .filter(passage => passage.rerankScore >= threshold)
        .sort((left, right) => right.rerankScore - left.rerankScore);
}

function createTutor(pool, { embeddings = createEmbeddingProvider(), rerank = rerankPassages } = {}) {
    const retriever = createRetriever(pool, embeddings);

    async function answerQuestion({ userId, courseSlug, question, signal }) {
        const requestId = randomUUID();
        const started = performance.now();
        const retrieved = await retriever.retrieve({ userId, courseSlug, question });
        if (!retrieved.authorized) return null;

        const rerankStarted = performance.now();
        const passages = retrieved.passages.length ? await rerank(question, retrieved.passages) : [];
        const answerStarted = performance.now();
        const answer = passages.length ? fixtureAnswer(question, passages) : abstain();

        const timingsMs = Object.fromEntries(Object.entries({
            ...retrieved.timingsMs,
            rerank: answerStarted - rerankStarted,
            generation: performance.now() - answerStarted,
            total: performance.now() - started
        }).map(([stage, duration]) => [stage, Number(duration.toFixed(2))]));

        return {
            ...answer,
            requestId,
            trace: {
                mode: 'local', strategy: retrieved.strategy, vectorEngine: retrieved.vectorEngine, timingsMs,
                passages: passages.map(({ id, revisionId, keywordRank, vectorRank, rerankScore }) => ({ id, revisionId, keywordRank, vectorRank, rerankScore }))
            }
        };
    }

    return { ...retriever, answerQuestion };
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ownConversations = `
    FROM classlyai.tutor_conversations AS conversation
    JOIN classlyai.courses AS course ON course.id = conversation.course_id AND course.slug = $2
    JOIN classlyai.course_memberships AS membership ON membership.course_id = course.id
        AND membership.user_id = $1 AND membership.revoked_at IS NULL
    WHERE conversation.student_id = $1
`;

// Stores one question and answer. Returns the conversation id, or 'missing' / 'full'.
async function saveExchange(pool, { userId, courseSlug, conversationId, question, answer }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let id = conversationId?.toLowerCase();
        if (id) {
            const { rowCount } = await client.query(`
                SELECT conversation.id ${ownConversations} AND conversation.id = $3 FOR UPDATE OF conversation
            `, [userId, courseSlug, id]);
            if (!rowCount) { await client.query('ROLLBACK'); return 'missing'; }
        } else {
            const { rows: [created] } = await client.query(`
                INSERT INTO classlyai.tutor_conversations (course_id, student_id, title)
                SELECT course.id, $1, left($3, 120)
                FROM classlyai.courses AS course
                JOIN classlyai.course_memberships AS membership ON membership.course_id = course.id
                    AND membership.user_id = $1 AND membership.revoked_at IS NULL
                WHERE course.slug = $2
                RETURNING id
            `, [userId, courseSlug, question.replace(/\s+/g, ' ').trim()]);
            if (!created) { await client.query('ROLLBACK'); return 'missing'; }
            id = created.id;
        }
        const { rows: [next] } = await client.query('SELECT COALESCE(max(ordinal), 0) + 1 AS ordinal FROM classlyai.tutor_messages WHERE conversation_id = $1', [id]);
        if (next.ordinal > 50) { await client.query('ROLLBACK'); return 'full'; }
        await client.query('INSERT INTO classlyai.tutor_messages (conversation_id, ordinal, question, answer) VALUES ($1, $2, $3, $4)', [id, next.ordinal, question, answer]);
        await client.query('UPDATE classlyai.tutor_conversations SET updated_at = now() WHERE id = $1', [id]);
        await client.query('COMMIT');
        return id;
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}

function createTutorRouter(pool) {
    const tutor = createTutor(pool);
    const router = Router();
    router.param('courseSlug', (_req, res, next, slug) => {
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return res.status(404).json({ message: 'Course not found.' });
        next();
    });
    const usageLimit = rateLimit({
        windowMs: 60_000,
        limit: 12,
        keyGenerator: req => req.user.id,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { message: 'You have reached the tutor limit. Try again in a minute.' }
    });

    router.post('/:courseSlug/tutor', usageLimit, async (req, res) => {
        const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
        if (!question || question.length > 1000 || question.includes('\0')) {
            return res.status(400).json({ message: 'Enter a question between 1 and 1,000 characters.' });
        }
        const controller = new AbortController();
        res.once('close', () => controller.abort());
        const conversationId = req.body?.conversationId;
        if (conversationId !== undefined && (typeof conversationId !== 'string' || !uuidPattern.test(conversationId))) {
            return res.status(400).json({ message: 'Open a saved conversation from the list.' });
        }
        const answer = await tutor.answerQuestion({ userId: req.user.id, courseSlug: req.params.courseSlug, question, signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!answer) return res.status(404).json({ message: 'Course not found.' });
        console.info('ClasslyAI tutor completed.', { requestId: answer.requestId, status: answer.status, strategy: answer.trace.strategy, timingsMs: answer.trace.timingsMs });

        const { status, claims, citations } = answer;
        const saved = await saveExchange(pool, { userId: req.user.id, courseSlug: req.params.courseSlug, conversationId, question, answer: { status, claims, citations } });
        if (saved === 'missing') return res.status(404).json({ message: 'Conversation not found.' });
        if (saved === 'full') return res.status(409).json({ message: 'This conversation is full. Start a new chat.' });
        res.json({ ...answer, conversationId: saved });
    });

    router.get('/:courseSlug/conversations', async (req, res) => {
        const { rows } = await pool.query(`
            SELECT conversation.id, conversation.title, conversation.updated_at AS "updatedAt"
            ${ownConversations}
            ORDER BY conversation.updated_at DESC LIMIT 30
        `, [req.user.id, req.params.courseSlug]);
        res.json({ conversations: rows });
    });

    router.get('/:courseSlug/conversations/:conversationId', async (req, res) => {
        if (!uuidPattern.test(req.params.conversationId)) return res.status(404).json({ message: 'Conversation not found.' });
        const { rows: [conversation] } = await pool.query(`
            SELECT conversation.id, conversation.title,
                COALESCE((SELECT jsonb_agg(jsonb_build_object('question', message.question, 'answer', message.answer) ORDER BY message.ordinal)
                    FROM classlyai.tutor_messages AS message WHERE message.conversation_id = conversation.id), '[]'::jsonb) AS messages
            ${ownConversations} AND conversation.id = $3
        `, [req.user.id, req.params.courseSlug, req.params.conversationId]);
        if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
        res.json({ conversation });
    });

    router.delete('/:courseSlug/conversations/:conversationId', async (req, res) => {
        if (!uuidPattern.test(req.params.conversationId)) return res.status(404).json({ message: 'Conversation not found.' });
        const { rowCount } = await pool.query(`
            DELETE FROM classlyai.tutor_conversations AS conversation
            USING classlyai.courses AS course
            WHERE conversation.course_id = course.id AND course.slug = $2 AND conversation.student_id = $1 AND conversation.id = $3
        `, [req.user.id, req.params.courseSlug, req.params.conversationId]);
        if (!rowCount) return res.status(404).json({ message: 'Conversation not found.' });
        res.json({ deleted: true });
    });

    router.get('/:courseSlug/citations/:citationId', async (req, res) => {
        const { courseSlug, citationId } = req.params;
        if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(citationId)) {
            return res.status(404).json({ message: 'Citation not found.' });
        }
        const citation = await tutor.getCitation({ userId: req.user.id, courseSlug, citationId });
        if (!citation) return res.status(404).json({ message: 'Citation not found.' });
        res.json({ citation });
    });

    return router;
}

module.exports = { createTutor, createTutorRouter, fixtureAnswer, validateAnswer };
