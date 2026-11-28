const { join } = require('node:path');

const artifacts = join(__dirname, 'artifacts');
const loaded = new Map();

function load(name) {
    if (!loaded.has(name)) {
        loaded.set(name, import('@huggingface/transformers').then(async ({ AutoModelForSequenceClassification, AutoTokenizer, env }) => {
            env.allowRemoteModels = false;
            env.localModelPath = artifacts;
            const meta = require(join(artifacts, name, 'classlyai.json'));
            const [tokenizer, model] = await Promise.all([
                AutoTokenizer.from_pretrained(name),
                AutoModelForSequenceClassification.from_pretrained(name, { dtype: meta.dtype })
            ]);
            return { tokenizer, model, meta };
        }));
        loaded.get(name).catch(() => loaded.delete(name));
    }
    return loaded.get(name);
}

// One local cross-encoder serves both tasks: pairs are [text, textB] and scores are probabilities.
async function score(name, pairs) {
    const { tokenizer, model } = await load(name);
    const scores = [];
    for (let start = 0; start < pairs.length; start += 16) {
        const chunk = pairs.slice(start, start + 16);
        const inputs = tokenizer(chunk.map(pair => pair[0]), { text_pair: chunk.map(pair => pair[1]), padding: true, truncation: true, max_length: 256 });
        const { logits } = await model(inputs);
        scores.push(...Array.from(logits.data, logit => 1 / (1 + Math.exp(-logit))));
    }
    return scores;
}

const metadata = async name => (await load(name)).meta;

module.exports = { score, metadata };
