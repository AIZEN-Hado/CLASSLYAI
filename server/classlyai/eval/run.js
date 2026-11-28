const { createPostgresPool } = require('../../db/postgres');
const { courses } = require('../../db/demo-classroom');
const { createEmbeddingProvider } = require('../embedding-provider');
const { createTutor } = require('../tutor');

const [backend, search] = courses;
const questions = [
    { id: 'atomic-writes', kind: 'exact', course: backend, question: 'What does rolling back a transaction discard?', section: 'Atomic writes' },
    { id: 'atomic-order', kind: 'paraphrase', course: backend, question: 'Why keep an enrollment and a receipt together when a course purchase fails?', section: 'Atomic writes' },
    { id: 'request-retry', kind: 'exact', course: backend, question: 'What does an idempotency key do?', section: 'Retrying a request' },
    { id: 'lost-response', kind: 'paraphrase', course: backend, question: 'How can the client recover the result after losing the server response?', section: 'Retrying a request' },
    { id: 'concurrent-sessions', kind: 'exact', course: backend, question: 'How do two database sessions verify concurrency behavior?', section: 'Isolation' },
    { id: 'recall-at-five', kind: 'exact', course: search, question: 'What is recall at five?', section: 'Retrieval recall' },
    { id: 'fair-comparison', kind: 'paraphrase', course: search, question: 'How do we keep a benchmark comparison of ranking methods fair?', section: 'Retrieval recall' },
    { id: 'retrieval-isolation', kind: 'exact', course: search, question: 'Why filter candidate passages by course membership before ranking?', section: 'Isolation' },
    { id: 'unsupported-coverage', kind: 'paraphrase', course: search, question: 'How should we measure whether the tutor detects insufficient evidence?', section: 'Unsupported questions' },
    { id: 'unknown-expiration', kind: 'unsupported', course: backend, question: 'How many milliseconds does a client keep an idempotency key before expiration?' },
    { id: 'orbital-velocity', kind: 'unsupported', course: backend, question: 'What is the orbital velocity of Mercury?' },
    { id: 'mitochondria', kind: 'unsupported', course: search, question: 'How do mitochondria regulate cellular respiration?' }
];

const rankings = ['keyword', 'vector', 'hybrid'];
const round = number => Number(number.toFixed(2));

function percentile(samples, fraction) {
    const sorted = [...samples].sort((a, b) => a - b);
    return round(sorted[Math.ceil(fraction * sorted.length) - 1]);
}

function input(testCase) {
    return { userId: testCase.course.studentId, courseSlug: testCase.course.slug, question: testCase.question };
}

async function runRanking(tutor, strategy, labeled) {
    const runs = [];
    for (const testCase of labeled) {
        const result = await tutor.retrieve({ ...input(testCase), strategy });
        if (!result.authorized || result.strategy !== strategy) throw new Error(`Could not evaluate ${strategy} on ${testCase.id}.`);
        const rank = result.passages.findIndex(passage => passage.revisionId === testCase.course.lesson.revisionId && passage.section === testCase.section) + 1;
        runs.push({ id: testCase.id, rank, kind: testCase.kind, retrievalMs: result.timingsMs.retrieval, searchMs: result.timingsMs.search, vectorEngine: result.vectorEngine });
    }

    return {
        strategy,
        labeledQuestions: runs.length,
        vectorEngine: runs.find(run => run.vectorEngine)?.vectorEngine ?? null,
        top1Accuracy: round(runs.filter(run => run.rank === 1).length / runs.length),
        recallAt5: round(runs.filter(run => run.rank > 0).length / runs.length),
        meanReciprocalRankAt5: round(runs.reduce((sum, run) => sum + (run.rank ? 1 / run.rank : 0), 0) / runs.length),
        retrievalMs: { p50: percentile(runs.map(run => run.retrievalMs), 0.5), p95: percentile(runs.map(run => run.retrievalMs), 0.95) },
        searchMs: { p50: percentile(runs.map(run => run.searchMs), 0.5), p95: percentile(runs.map(run => run.searchMs), 0.95) },
        misses: runs.filter(run => !run.rank).map(({ id, kind }) => ({ id, kind }))
    };
}

async function main() {
    const live = process.argv.includes('--live');
    const env = live ? process.env : { ...process.env, CLASSLYAI_AI_MODE: 'fixture' };
    const embeddings = createEmbeddingProvider(env);
    if (live && embeddings.mode !== 'openai') throw new Error('The live benchmark needs an OpenAI key and live AI mode.');
    const pool = createPostgresPool();

    try {
        const { rows: fixture } = await pool.query(`
            SELECT chunk.revision_id, count(*)::int AS passages FROM classlyai.lesson_chunks AS chunk
            JOIN classlyai.lessons AS lesson ON chunk.revision_id = lesson.active_revision_id
            JOIN classlyai.lesson_revisions AS revision ON revision.id = chunk.revision_id
            WHERE chunk.fingerprint = $1 AND chunk.revision_id = ANY($2::uuid[]) AND revision.withdrawn_at IS NULL
            GROUP BY chunk.revision_id ORDER BY chunk.revision_id
        `, [embeddings.fingerprint, courses.map(course => course.lesson.revisionId)]);
        if (fixture.length !== courses.length) {
            throw new Error('Index both seeded lesson revisions with the worker and the selected provider before running the benchmark.');
        }

        const tutor = createTutor(pool, { env, embeddings });
        const labeled = questions.filter(question => question.section);
        const report = { corpus: 'seeded-classroom-v1', mode: embeddings.mode, fingerprint: embeddings.fingerprint, passagesPerRevision: fixture, retrieval: [] };
        if (fixture.some(revision => revision.passages <= 5)) report.note = 'Use top-1 and MRR for this small corpus because Recall@5 can saturate.';
        for (const strategy of rankings) report.retrieval.push(await runRanking(tutor, strategy, labeled));

        const answerChecks = [];
        for (const testCase of questions) {
            const answer = await tutor.answerQuestion(input(testCase));
            if (!answer) throw new Error(`The seeded account cannot access ${testCase.id}.`);
            const expectedStatus = testCase.section ? 'answered' : 'insufficient_evidence';
            const expectedCitation = !testCase.section || answer.citations.some(citation => citation.section === testCase.section);
            answerChecks.push({
                id: testCase.id, kind: testCase.kind, status: answer.status, mode: answer.trace.mode,
                expectedStatus, expectedCitation, timingMs: answer.trace.timingsMs.total
            });
        }
        const unsupported = answerChecks.filter(run => run.kind === 'unsupported');
        report.answers = {
            samples: answerChecks.length,
            expectedAbstentions: unsupported.length,
            correctAbstentions: unsupported.filter(run => run.status === run.expectedStatus).length,
            correctSectionCitations: answerChecks.filter(run => run.expectedStatus === 'answered' && run.expectedCitation).length,
            fixtureFallbacks: answerChecks.filter(run => run.mode === 'fixture-fallback').length,
            totalMs: { p50: percentile(answerChecks.map(run => run.timingMs), 0.5), p95: percentile(answerChecks.map(run => run.timingMs), 0.95) },
            cases: answerChecks
        };

        const otherCourse = await tutor.retrieve({ userId: backend.studentId, courseSlug: search.slug, question: 'Isolation' });
        const otherSource = await tutor.retrieve({ userId: search.studentId, courseSlug: search.slug, question: 'Isolation', strategy: 'keyword' });
        const citationId = otherSource.passages[0]?.id;
        if (!citationId) throw new Error('The seeded isolation source was not indexed.');
        const crossCourseCitation = await tutor.getCitation({ userId: backend.studentId, courseSlug: backend.slug, citationId });
        report.isolation = {
            crossCourseRetrievalDenied: otherCourse.authorized === false && otherCourse.passages.length === 0,
            mismatchedCitationDenied: crossCourseCitation === null
        };
        console.log(JSON.stringify(report, null, 2));
        const fixtureQualityPassed = live || report.answers.correctSectionCitations === labeled.length;
        if (!fixtureQualityPassed || report.answers.correctAbstentions !== report.answers.expectedAbstentions
            || !Object.values(report.isolation).every(Boolean)) {
            process.exitCode = 1;
        }
    } finally {
        await pool.end();
    }
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
