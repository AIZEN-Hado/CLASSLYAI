const assert = require('node:assert/strict');
const { test } = require('node:test');
const { fixtureAnswer, validateAnswer } = require('./tutor');

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

test('extractive fallback uses exact source text and abstains on an unrelated question', () => {
    const answer = fixtureAnswer('How does an idempotency key help a retried request?', [passage]);
    assert.equal(answer.status, 'answered');
    assert.equal(answer.claims[0].text, passage.excerpt);
    assert.equal(fixtureAnswer('How many milliseconds does an idempotency key remain valid before expiration?', [passage]).status, 'insufficient_evidence');
    assert.deepEqual(fixtureAnswer('What is the orbital velocity of Mercury?', [passage]), {
        status: 'insufficient_evidence', claims: [], citations: []
    });
});
