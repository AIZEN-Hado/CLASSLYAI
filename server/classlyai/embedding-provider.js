const { createHash } = require('node:crypto');

const fixtureDimensions = 256;
const openAIDimensions = 512;
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

function createEmbeddingProvider(env = process.env) {
    const apiKey = env.CLASSLYAI_OPENAI_API_KEY || env.OPENAI_API_KEY;
    if (env.CLASSLYAI_AI_MODE === 'openai' && !apiKey) {
        throw new Error('Set CLASSLYAI_OPENAI_API_KEY to use OpenAI mode.');
    }
    if (!apiKey || env.CLASSLYAI_AI_MODE === 'fixture') {
        return {
            mode: 'fixture',
            fingerprint: `${chunkerVersion}:fixture-hash-v1:${fixtureDimensions}`,
            async embed(texts) {
                return texts.map(fixtureEmbedding);
            }
        };
    }

    const model = env.CLASSLYAI_OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    return {
        mode: 'openai',
        fingerprint: `${chunkerVersion}:openai:${model}:${openAIDimensions}`,
        async embed(texts) {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    input: texts,
                    dimensions: openAIDimensions,
                    encoding_format: 'float'
                }),
                signal: AbortSignal.timeout(12_000)
            });
            if (!response.ok) {
                await response.body?.cancel();
                throw new Error(`Embedding provider returned HTTP ${response.status}.`);
            }

            const { data } = await response.json();
            if (!Array.isArray(data) || data.length !== texts.length) {
                throw new Error('Embedding provider returned an invalid batch.');
            }
            const vectors = data.sort((left, right) => left?.index - right?.index);
            for (const [index, item] of vectors.entries()) {
                if (item?.index !== index || !Array.isArray(item.embedding) || item.embedding.length !== openAIDimensions
                    || !item.embedding.every(Number.isFinite)) {
                    throw new Error('Embedding provider returned an invalid vector.');
                }
            }
            return vectors.map(item => item.embedding);
        }
    };
}

module.exports = { createEmbeddingProvider };
