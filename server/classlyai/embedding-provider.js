const { createHash } = require('node:crypto');

const fixtureDimensions = 256;
const chunkerVersion = 'markdown-v1';

function fixtureEmbedding(text) {
    const vector = Array(fixtureDimensions).fill(0);
    const normalized = text.normalize('NFKC').toLowerCase();
    const terms = normalized.match(/[\p{L}\p{N}]+/gu) ?? [normalized];
    for (const term of terms) {
        const feature = term.length > 5 ? term.replace(/(?:ing|ed|es|s)$/, '') : term;
        const hash = createHash('sha256').update(feature).digest();
        vector[hash[0]] += hash[1] % 2 ? 1 : -1;
    }
    const magnitude = Math.hypot(...vector);
    return magnitude ? vector.map(value => value / magnitude) : vector;
}

function createEmbeddingProvider() {
    return {
        mode: 'fixture',
        fingerprint: `${chunkerVersion}:fixture-hash-v1:${fixtureDimensions}`,
        async embed(texts) {
            return texts.map(fixtureEmbedding);
        }
    };
}

module.exports = { createEmbeddingProvider };
