const { randomUUID } = require('node:crypto');

const maxAttempts = 4;
const chunkSize = 1200;
const batchSize = 32;

class InvalidLesson extends Error {}

function splitMarkdown(markdown) {
    if (markdown.length > 100_000) throw new InvalidLesson('The lesson is too long to index.');
    const chunks = [];
    let section = 'Overview';
    let sectionStart = 0;
    let fence;

    function addSection(end) {
        let start = sectionStart;
        while (start < end) {
            while (start < end && /\s/.test(markdown[start])) start++;
            if (start === end) break;
            let stop = Math.min(start + chunkSize, end);
            if (stop < end) {
                const window = markdown.slice(start, stop);
                const boundary = Math.max(window.lastIndexOf('\n'), window.lastIndexOf(' '));
                if (boundary >= chunkSize / 2) stop = start + boundary + 1;
                const code = markdown.charCodeAt(stop - 1);
                if (code >= 0xd800 && code <= 0xdbff) stop--;
            }
            const body = markdown.slice(start, stop).trimEnd();
            chunks.push({ ordinal: chunks.length, section, body, start_offset: start, end_offset: start + body.length });
            start = stop;
        }
    }

    for (const { 0: line, index } of markdown.matchAll(/[^\n]+(?:\n|$)|\n/g)) {
        const text = line.trimEnd();
        const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(text);
        if (fence) {
            if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) {
                fence = undefined;
            }
            continue;
        }
        if (marker) {
            fence = marker[1];
            continue;
        }
        const heading = /^ {0,3}#{1,6}[ \t]+(.+)$/.exec(text);
        if (heading) {
            addSection(index);
            section = heading[1].replace(/[ \t]+#+$/, '').trim().slice(0, 160) || 'Overview';
            sectionStart = index;
        }
    }
    addSection(markdown.length);
    if (!chunks.length) throw new InvalidLesson('Add lesson content before publishing.');
    if (chunks.length > 250) throw new InvalidLesson('Reduce the lesson length or the number of headings before publishing.');
    return chunks;
}

async function reconcileActiveJobs(pool, fingerprint) {
    await pool.query(`
        WITH active AS (
            SELECT lesson.active_revision_id
            FROM classlyai.lessons AS lesson
            JOIN classlyai.lesson_revisions AS revision ON revision.id = lesson.active_revision_id
            LEFT JOIN classlyai.ingestion_jobs AS existing ON existing.revision_id = revision.id
            WHERE revision.published_at IS NOT NULL AND revision.withdrawn_at IS NULL
                AND (existing.revision_id IS NULL OR (
                    existing.state IN ('ready', 'failed') AND existing.fingerprint IS DISTINCT FROM $1
                ))
            ORDER BY lesson.id FOR UPDATE OF lesson SKIP LOCKED
        )
        INSERT INTO classlyai.ingestion_jobs AS job (revision_id, fingerprint)
        SELECT active_revision_id, $1 FROM active
        ON CONFLICT (revision_id) DO UPDATE
        SET state = 'queued', attempts = 0, run_after = now(), fingerprint = EXCLUDED.fingerprint,
            last_error = NULL, updated_at = now()
        WHERE job.state IN ('ready', 'failed') AND job.fingerprint IS DISTINCT FROM EXCLUDED.fingerprint
    `, [fingerprint]);
}

async function claimJob(pool, fingerprint) {
    const { rows } = await pool.query(`
        WITH candidate AS (
            SELECT revision_id
            FROM classlyai.ingestion_jobs
            WHERE (state = 'queued' AND run_after <= now())
                OR (state = 'processing' AND lease_until <= now())
            ORDER BY run_after, revision_id
            LIMIT 1 FOR UPDATE SKIP LOCKED
        )
        UPDATE classlyai.ingestion_jobs AS job
        SET state = CASE WHEN job.attempts < $1 THEN 'processing' ELSE 'failed' END,
            attempts = LEAST(job.attempts + 1, $1),
            lease_token = CASE WHEN job.attempts < $1 THEN $2::uuid END,
            lease_until = CASE WHEN job.attempts < $1 THEN now() + interval '2 minutes' END,
            last_error = CASE WHEN job.attempts >= $1 THEN 'Indexing timed out. Try publishing again.' END,
            fingerprint = $3, updated_at = now()
        FROM candidate
        JOIN classlyai.lesson_revisions AS revision ON revision.id = candidate.revision_id
        WHERE job.revision_id = candidate.revision_id
        RETURNING job.revision_id, job.attempts, job.state, job.lease_token, revision.lesson_id, revision.markdown
    `, [maxAttempts, randomUUID(), fingerprint]);
    return rows[0];
}

async function embedChunks(markdown, provider) {
    const chunks = splitMarkdown(markdown);
    const indexed = [];
    for (let offset = 0; offset < chunks.length; offset += batchSize) {
        const batch = chunks.slice(offset, offset + batchSize);
        const vectors = await provider.embed(batch.map(chunk => chunk.body));
        if (vectors.length !== batch.length) throw new Error('Unexpected embedding batch size.');
        indexed.push(...batch.map((chunk, index) => ({ ...chunk, embedding: vectors[index] })));
    }
    return indexed;
}

async function finalizeJob(pool, job, fingerprint, chunks) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT id FROM classlyai.lessons WHERE id = $1 FOR UPDATE', [job.lesson_id]);
        const result = await client.query(`
            UPDATE classlyai.ingestion_jobs
            SET state = 'ready', lease_token = NULL, lease_until = NULL, last_error = NULL, updated_at = now()
            WHERE revision_id = $1 AND state = 'processing' AND lease_token = $2
                AND lease_until > clock_timestamp()
        `, [job.revision_id, job.lease_token]);
        if (!result.rowCount) {
            await client.query('ROLLBACK');
            return false;
        }

        if (chunks.length) {
            await client.query(`
                INSERT INTO classlyai.lesson_chunks (
                    revision_id, ordinal, section, body, start_offset, end_offset, embedding, fingerprint
                )
                SELECT $1, chunk.ordinal, chunk.section, chunk.body, chunk.start_offset, chunk.end_offset, chunk.embedding, $2
                FROM jsonb_to_recordset($3::jsonb) AS chunk (
                    ordinal integer, section text, body text, start_offset integer, end_offset integer, embedding real[]
                )
                ON CONFLICT (revision_id, fingerprint, ordinal) DO NOTHING
            `, [job.revision_id, fingerprint, JSON.stringify(chunks)]);
        }

        await client.query(`
            WITH publishable AS (
                UPDATE classlyai.lesson_revisions AS revision
                SET published_at = COALESCE(revision.published_at, now())
                FROM classlyai.lessons AS lesson
                WHERE lesson.id = $1 AND lesson.requested_revision_id = $2
                    AND revision.id = $2 AND revision.withdrawn_at IS NULL
                RETURNING revision.id
            )
            UPDATE classlyai.lessons AS lesson
            SET active_revision_id = publishable.id
            FROM publishable WHERE lesson.id = $1
        `, [job.lesson_id, job.revision_id]);
        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}

async function processNextJob(pool, provider) {
    const job = await claimJob(pool, provider.fingerprint);
    if (!job) return { state: 'idle' };
    const revisionId = job.revision_id;
    if (job.state === 'failed') return { state: 'failed', revisionId };

    try {
        const cached = await pool.query(`
            SELECT 1 FROM classlyai.lesson_chunks WHERE revision_id = $1 AND fingerprint = $2 LIMIT 1
        `, [revisionId, provider.fingerprint]);
        const chunks = cached.rowCount ? [] : await embedChunks(job.markdown, provider);
        const completed = await finalizeJob(pool, job, provider.fingerprint, chunks);
        return { state: completed ? 'ready' : 'stale', revisionId };
    } catch (error) {
        const invalid = error instanceof InvalidLesson;
        const state = invalid || job.attempts >= maxAttempts ? 'failed' : 'queued';
        const message = invalid ? error.message : 'Indexing could not finish. Try publishing again if it keeps failing.';
        const { rowCount } = await pool.query(`
            UPDATE classlyai.ingestion_jobs
            SET state = $3, lease_token = NULL, lease_until = NULL,
                last_error = $4, run_after = now() + $5 * interval '1 second', updated_at = now()
            WHERE revision_id = $1 AND state = 'processing' AND lease_token = $2
                AND lease_until > clock_timestamp()
        `, [revisionId, job.lease_token, state, message, 2 ** job.attempts]);
        return { state: rowCount ? state : 'stale', revisionId };
    }
}

module.exports = { processNextJob, reconcileActiveJobs, splitMarkdown };
