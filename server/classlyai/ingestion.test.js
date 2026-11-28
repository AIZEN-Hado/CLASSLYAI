const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createEmbeddingProvider } = require('./embedding-provider');
const { splitMarkdown } = require('./ingestion');

test('Markdown chunks preserve exact Unicode and CRLF source spans', () => {
    const markdown = '# Queue 😀\r\n\r\n```text\r\n## Code example\r\n```\r\n\r\n## Leases\r\n\r\n'
        + 'x'.repeat(1199) + '😀 tail';
    const chunks = splitMarkdown(markdown);

    assert.deepEqual([...new Set(chunks.map(chunk => chunk.section))], ['Queue 😀', 'Leases']);
    chunks.forEach((chunk, ordinal) => {
        assert.equal(chunk.ordinal, ordinal);
        assert.equal(chunk.body, markdown.slice(chunk.start_offset, chunk.end_offset));
        assert.equal(chunk.body.length <= 1200, true);
        assert.doesNotMatch(chunk.body, /[\uD800-\uDFFF]/u);
    });

    const boundary = 'x'.repeat(1199) + '😀 tail';
    assert.deepEqual(splitMarkdown(boundary).map(chunk => chunk.body), ['x'.repeat(1199), '😀 tail']);
    assert.throws(() => splitMarkdown('  \n\r\n  '), /Add lesson content/);
});

test('fixture embeddings are normalized, ordered, and deterministic', async () => {
    const provider = createEmbeddingProvider();
    const texts = ['Rerun an indexing job.', 'Read a published lesson.'];
    const vectors = await provider.embed(texts);
    assert.equal(provider.mode, 'fixture');
    assert.deepEqual(await provider.embed([...texts].reverse()), [...vectors].reverse());
    assert.notDeepEqual(...vectors);
    for (const vector of vectors) assert.ok(Math.abs(Math.hypot(...vector) - 1) < 1e-12);
});
