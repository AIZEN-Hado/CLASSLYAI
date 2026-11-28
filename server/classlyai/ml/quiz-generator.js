const { join } = require('node:path');
const { splitMarkdown } = require('../ingestion');
const { questionTerms } = require('../retrieval');
const { metadata, score } = require('./runtime');

const modelId = process.env.CLASSLYAI_QUIZ_MODEL || 'onnx-community/Qwen2.5-1.5B-Instruct';
const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
const system = 'You write one multiple-choice quiz question from a lesson sentence. '
    + 'Reply with one line of JSON only: {"question": string ending in "?", "answer": string, "distractors": [string, string]}. '
    + 'The answer is a short phrase of at most six words copied exactly from the sentence, and the question must not contain it. '
    + 'The two distractors are plausible but wrong short phrases of similar length.';
const example = [
    { role: 'user', content: 'Section: HTTP caching\nSentence: A max-age of 3600 means the stored copy may be reused for one hour without asking the server.' },
    { role: 'assistant', content: '{"question":"For how long may a stored copy be reused when max-age is 3600?","answer":"one hour","distractors":["one day","ten minutes"]}' },
];

let generator;

function loadGenerator() {
    generator ??= import('@huggingface/transformers').then(({ pipeline, env }) => {
        env.cacheDir = join(__dirname, '../../.cache/models');
        return pipeline('text-generation', modelId, { dtype: 'q4' });
    });
    generator.catch(() => { generator = undefined; });
    return generator;
}

// One CPU model serves quizzes, notes and answer checks, so jobs run one at a time.
// Drafting refuses to start while anything else is running; checking waits its turn.
let tail = Promise.resolve();
let pending = 0;

function queued(task) {
    pending++;
    const run = tail.then(task);
    tail = run.then(() => {}, () => {}).then(() => { pending--; });
    return run;
}

function exclusive(task) {
    if (pending > 0) return Promise.reject(Object.assign(new Error('Another draft is being written. Try again in a minute.'), { status: 429 }));
    return queued(task);
}

async function chat(messages, maxTokens) {
    const model = await loadGenerator();
    const output = await model(messages, { max_new_tokens: maxTokens, do_sample: false });
    return output[0].generated_text.at(-1).content;
}

const normalize = text => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const wordCount = text => text.trim().split(/\s+/).length;

// One sentence per section first, so the quiz spreads across the lesson.
function candidates(markdown) {
    const bySection = new Map();
    for (const chunk of splitMarkdown(markdown)) {
        for (const { segment } of segmenter.segment(chunk.body)) {
            const sentence = segment.trim();
            const words = wordCount(sentence);
            if (words < 8 || words > 35 || /[`|#]/.test(sentence) || !/[.!]$/.test(sentence)) continue;
            if (!bySection.has(chunk.section)) bySection.set(chunk.section, []);
            bySection.get(chunk.section).push({ section: chunk.section, sentence, passage: chunk.body });
        }
    }
    const rounds = [];
    for (let round = 0; ; round++) {
        const layer = [...bySection.values()].map(list => list[round]).filter(Boolean);
        if (!layer.length) return rounds;
        rounds.push(...layer);
    }
}

function parseDraft(text) {
    const match = /\{[\s\S]*\}/.exec(text);
    if (!match) return null;
    try {
        const { question, answer, distractors } = JSON.parse(match[0]);
        if ([question, answer].some(value => typeof value !== 'string') || !Array.isArray(distractors)) return null;
        return { question: question.trim(), answer: answer.trim().replace(/[.]$/, ''), distractors: distractors.filter(value => typeof value === 'string').map(value => value.trim().replace(/[.]$/, '')) };
    } catch {
        return null;
    }
}

// A draft survives only if its answer is quoted from the lesson sentence and its distractors are not.
function acceptable(draft, sentence) {
    if (!draft || !draft.question.endsWith('?') || draft.question.length > 300 || wordCount(draft.question) < 4) return false;
    const answer = normalize(draft.answer);
    if (answer.length < 5 || wordCount(answer) > 8 || !normalize(sentence).includes(answer)) return false;
    if (!questionTerms(answer).some(term => term.length >= 4)) return false; // "there" or "it" is not an answer
    const question = normalize(draft.question);
    if (/\b(it|they|them|this|these|those)\b/.test(question)) return false; // the question must stand on its own
    // The question must not give the answer away, even in another word form.
    return !answer.split(' ').filter(word => word.length >= 5).some(word => question.includes(word.slice(0, 5)));
}

// Distractors that share most words with the answer are near-synonyms, which would mark a correct answer wrong.
function distinct(candidate, answer) {
    const a = new Set(normalize(answer).split(' '));
    const b = new Set(normalize(candidate).split(' '));
    const shared = [...a].filter(word => b.has(word)).length;
    return shared / new Set([...a, ...b]).size < 0.5;
}

function shuffled(options, correctText, seed) {
    let state = [...seed].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 7);
    const order = options.map((option, index) => ({ option, key: (state = (state * 1664525 + 1013904223) >>> 0) + index }));
    order.sort((a, b) => a.key - b.key);
    return { options: order.map(item => item.option), correct: order.findIndex(item => item.option === correctText) };
}

// Draft up to `count` reviewable questions. Nothing is saved; the instructor edits and publishes.
function generateQuiz(markdown, options) {
    return exclusive(() => draftQuiz(markdown, options));
}

async function draftQuiz(markdown, { count = 3, generate } = {}) {
    const run = generate ?? ((section, sentence) => chat([{ role: 'system', content: system }, ...example, { role: 'user', content: `Section: ${section}\nSentence: ${sentence}` }], 110));
    const { threshold } = await metadata('reranker');
    const drafts = [];
    const pool = candidates(markdown);
    for (const item of pool) {
        if (drafts.length >= count + 3) break;
        const draft = parseDraft(await run(item.section, item.sentence));
        if (!acceptable(draft, item.sentence)) continue;
        const [relevance] = await score('reranker', [[draft.question, `${item.section}. ${item.passage}`]]);
        if (relevance >= threshold) drafts.push({ ...draft, relevance, sentence: item.sentence });
    }

    const questions = [];
    for (const draft of drafts) {
        if (questions.length >= count) break;
        const wrong = new Set();
        for (const candidate of draft.distractors) {
            const key = normalize(candidate);
            if (key && key !== normalize(draft.answer) && !normalize(draft.sentence).includes(key) && distinct(candidate, draft.answer) && !wrong.has(candidate)) wrong.add(candidate);
            if (wrong.size === 2) break;
        }
        if (wrong.size < 2) continue;
        questions.push({ prompt: draft.question, ...shuffled([draft.answer, ...wrong], draft.answer, draft.question), source: 'generated', relevance: Number(draft.relevance.toFixed(3)) });
    }
    return questions;
}

module.exports = { generateQuiz, candidates, parseDraft, acceptable, modelId, exclusive, queued, chat, normalize };
