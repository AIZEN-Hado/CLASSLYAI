const assert = require('node:assert/strict');
const { test } = require('node:test');
const { chooseSentence, fixtureAnswer, validateAnswer } = require('./tutor');

const passage = {
    id: '00000000-0000-4000-8000-000000000001',
    lessonSlug: 'transactions',
    section: 'Retries',
    excerpt: 'Use an idempotency key to recognize a retried request and return the original result.'
};

test('validates quoted evidence from the retrieved set before returning citations', () => {
    const answer = { status: 'answered', claims: [{ text: 'Reuse the key.', evidence: [{ id: passage.id, quote: 'idempotency key' }] }] };
    assert.deepEqual(validateAnswer(answer, [passage]), {
        status: 'answered', claims: [{ text: 'Reuse the key.', citationIds: [passage.id] }], citations: [passage]
    });
    assert.equal(validateAnswer(answer, []), null);
    assert.equal(validateAnswer({ ...answer, claims: [{ ...answer.claims[0], evidence: [{ id: passage.id, quote: 'invented quote' }] }] }, [passage]), null);
    assert.equal(validateAnswer({ status: 'answered', claims: [{ text: 'Claim without evidence.', evidence: [] }] }, [passage]), null);
});

test('the reranker picks the answering sentence, quotes it exactly, and abstains when nothing supports an answer', async () => {
    const atomic = {
        id: '00000000-0000-4000-8000-000000000002',
        section: 'Atomic writes',
        excerpt: 'A transaction commits its writes together. Rolling back a transaction discards its writes. If a course purchase creates an enrollment and a receipt in one transaction, a failure rolls back both records.'
    };
    const answer = await chooseSentence('What does rolling back a transaction discard?', [atomic]);
    assert.equal(answer.status, 'answered');
    assert.equal(answer.claims[0].text, 'Rolling back a transaction discards its writes.');
    assert.ok(atomic.excerpt.includes(answer.claims[0].text));
    assert.deepEqual(answer.citations.map(citation => citation.id), [atomic.id]);
    assert.equal((await chooseSentence('What is the orbital velocity of Mercury?', [atomic])).status, 'insufficient_evidence');
    assert.equal((await chooseSentence('Anything at all?', [])).status, 'insufficient_evidence');
});

test('extractive fallback uses exact source text and abstains on an unrelated question', () => {
    const answer = fixtureAnswer('How does an idempotency key help a retried request?', [passage]);
    assert.equal(answer.status, 'answered');
    assert.equal(answer.claims[0].text, passage.excerpt);
    assert.equal(fixtureAnswer('How many milliseconds does an idempotency key remain valid before expiration?', [passage]).status, 'insufficient_evidence');
    assert.deepEqual(fixtureAnswer('What is the orbital velocity of Mercury?', [passage]), {
        status: 'insufficient_evidence', claims: [], citations: []
    });
});
