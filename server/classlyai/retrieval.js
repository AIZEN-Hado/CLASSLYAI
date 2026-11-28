const { performance } = require('node:perf_hooks');
const { createEmbeddingProvider } = require('./embedding-provider');

const access = `
    FROM classlyai.courses AS course
    JOIN classlyai.course_memberships AS membership ON membership.course_id = course.id
    WHERE membership.user_id = $1 AND course.slug = $2 AND membership.revoked_at IS NULL
`;

const stopWords = new Set('a an and are as at be can could did do does for from had has have how i in is it me of on or should that the their then there this to use was were what when where which who why will with would you'.split(' '));

function questionTerms(text) {
    const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    return [...new Set(words.filter(word => word.length > 1 && !stopWords.has(word)))];
}

function retrievalSql(usePgvector) {
    const similarity = usePgvector
        ? '1 - (candidate.embedding::vector <=> input.embedding::vector)'
        : `(
            SELECT sum(x::double precision * y) / NULLIF(sqrt(sum(x::double precision * x) * sum(y::double precision * y)), 0)
            FROM unnest(candidate.embedding, input.embedding) AS pair(x, y)
        )`;

    return `
        WITH scoped_course AS MATERIALIZED (
            SELECT course.id ${access}
        ), eligible AS NOT MATERIALIZED (
            SELECT chunk.id, chunk.search, chunk.embedding, chunk.fingerprint
            FROM scoped_course
            JOIN classlyai.lessons AS lesson ON lesson.course_id = scoped_course.id
            JOIN classlyai.lesson_revisions AS revision ON revision.id = lesson.active_revision_id
                AND revision.published_at IS NOT NULL AND revision.withdrawn_at IS NULL
            JOIN classlyai.lesson_chunks AS chunk ON chunk.revision_id = revision.id
                AND chunk.fingerprint = COALESCE(
                    (SELECT fingerprint FROM classlyai.lesson_chunks WHERE revision_id = revision.id AND fingerprint = $5 LIMIT 1),
                    (SELECT fingerprint FROM classlyai.lesson_chunks WHERE revision_id = revision.id ORDER BY fingerprint DESC LIMIT 1)
                )
        ), input AS (
            SELECT websearch_to_tsquery('english', $3::text) AS terms, $4::real[] AS embedding
        ), lexical_candidates AS (
            SELECT candidate.id, ts_rank_cd(candidate.search, input.terms, 32) AS score
            FROM eligible AS candidate CROSS JOIN input
            WHERE $7 <> 'vector' AND candidate.search @@ input.terms
            ORDER BY score DESC, candidate.id LIMIT ($6::int * 2)
        ), vector_scores AS MATERIALIZED (
            SELECT candidate.id, ${similarity} AS score
            FROM eligible AS candidate CROSS JOIN input
            WHERE $7 <> 'keyword' AND candidate.fingerprint = $5
                AND cardinality(candidate.embedding) = cardinality(input.embedding)
        ), vector_candidates AS (
            SELECT id, score FROM vector_scores WHERE score > 0 AND score <= 1.000001
            ORDER BY score DESC, id LIMIT ($6::int * 2)
        ), lexical AS (
            SELECT id, row_number() OVER (ORDER BY score DESC, id) AS rank FROM lexical_candidates
        ), vector AS (
            SELECT id, row_number() OVER (ORDER BY score DESC, id) AS rank FROM vector_candidates
        ), ranked AS (
            SELECT COALESCE(lexical.id, vector.id) AS id, lexical.rank AS keyword_rank, vector.rank AS vector_rank,
                COALESCE(1.0 / (60 + lexical.rank), 0) + COALESCE(1.0 / (60 + vector.rank), 0) AS score
            FROM lexical FULL JOIN vector ON lexical.id = vector.id
            ORDER BY score DESC, id LIMIT $6
        )
        SELECT EXISTS(SELECT 1 FROM scoped_course) AS authorized,
            COALESCE(jsonb_agg(jsonb_build_object(
                'id', chunk.id, 'revisionId', revision.id, 'lessonSlug', lesson.slug, 'lessonTitle', revision.title,
                'section', chunk.section, 'excerpt', chunk.body, 'startOffset', chunk.start_offset, 'endOffset', chunk.end_offset,
                'keywordRank', ranked.keyword_rank, 'vectorRank', ranked.vector_rank
            ) ORDER BY ranked.score DESC, ranked.id), '[]'::jsonb) AS passages
        FROM ranked
        JOIN classlyai.lesson_chunks AS chunk ON chunk.id = ranked.id
        JOIN classlyai.lesson_revisions AS revision ON revision.id = chunk.revision_id
        JOIN classlyai.lessons AS lesson ON lesson.id = revision.lesson_id
    `;
}

function createRetriever(pool, embeddings = createEmbeddingProvider()) {
    let pgvector;

    async function retrieve({ userId, courseSlug, question, strategy = 'hybrid', limit = 5 }) {
        const started = performance.now();
        const { rows: [membership] } = await pool.query(`SELECT EXISTS (SELECT 1 ${access}) AS authorized`, [userId, courseSlug]);
        if (!membership.authorized) return { authorized: false, passages: [] };

        let embedding = null;
        let embeddingMs = 0;
        let executedStrategy = strategy;
        if (strategy !== 'keyword') {
            const embedStarted = performance.now();
            try {
                [embedding] = await embeddings.embed([question]);
                if (!embedding?.length || !embedding.every(Number.isFinite)) throw new Error('Invalid question embedding.');
            } catch (error) {
                if (strategy !== 'hybrid') throw error;
                executedStrategy = 'keyword';
                embedding = null;
            }
            embeddingMs = performance.now() - embedStarted;
        }

        if (embedding && pgvector === undefined) {
            const { rows: [extension] } = await pool.query("SELECT to_regtype('vector') IS NOT NULL AS installed");
            pgvector = extension.installed;
        }

        const searchStarted = performance.now();
        const { rows: [result] } = await pool.query(retrievalSql(Boolean(embedding && pgvector)), [
            userId, courseSlug, questionTerms(question).slice(0, 24).join(' OR '), embedding, embeddings.fingerprint, limit, executedStrategy
        ]);
        return {
            ...result,
            strategy: executedStrategy,
            vectorEngine: embedding ? (pgvector ? 'pgvector' : 'postgres-array') : null,
            timingsMs: { embedding: embeddingMs, search: performance.now() - searchStarted, retrieval: performance.now() - started }
        };
    }

    async function getCitation({ userId, courseSlug, citationId }) {
        const { rows: [citation] } = await pool.query(`
            WITH scoped_course AS (SELECT course.id ${access})
            SELECT chunk.id, revision.id AS "revisionId", lesson.slug AS "lessonSlug", revision.title AS "lessonTitle",
                chunk.section, chunk.body AS excerpt, chunk.start_offset AS "startOffset", chunk.end_offset AS "endOffset", revision.markdown
            FROM scoped_course
            JOIN classlyai.lessons AS lesson ON lesson.course_id = scoped_course.id
            JOIN classlyai.lesson_revisions AS revision ON revision.lesson_id = lesson.id
                AND revision.published_at IS NOT NULL AND revision.withdrawn_at IS NULL
            JOIN classlyai.lesson_chunks AS chunk ON chunk.revision_id = revision.id
            WHERE chunk.id = $3
        `, [userId, courseSlug, citationId]);
        if (!citation || citation.markdown.slice(citation.startOffset, citation.endOffset) !== citation.excerpt) return null;
        return citation;
    }

    return { retrieve, getCitation };
}

module.exports = { createRetriever, questionTerms };
