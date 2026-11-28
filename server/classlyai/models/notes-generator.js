const { splitMarkdown } = require('../ingestion');
const { questionTerms } = require('../retrieval');
const { chat, exclusive } = require('./quiz-generator');

const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
const system = 'You write a study note for one lesson section. Reply with one or two plain sentences, at most 40 words, that capture the key idea. '
    + 'Use only facts stated in the section. No lists, no preamble, no quotation marks.';
const example = [
    { role: 'user', content: 'Section: Cache busting\nText: Static assets can carry a content hash in the filename. A changed file gets a new URL, so long-lived caching never serves stale code.' },
    { role: 'assistant', content: 'Put a content hash in static filenames: a changed file gets a new URL, so long-lived caching never serves stale code.' },
];

function sections(markdown) {
    const grouped = new Map();
    for (const chunk of splitMarkdown(markdown)) grouped.set(chunk.section, `${grouped.get(chunk.section) ?? ''} ${chunk.body}`.trim());
    return [...grouped].slice(0, 12).map(([heading, text]) => ({ heading, text }));
}

function clean(text) {
    return text.replace(/^[\s"'*•-]+|["'\s]+$/g, '').replace(/\s+/g, ' ');
}

// A note is grounded when most of its content words appear in the section it summarizes.
function grounded(note, text) {
    const words = questionTerms(note).filter(term => term.length >= 4);
    if (words.length < 3) return false;
    const source = questionTerms(text).map(term => term.slice(0, 5));
    return words.filter(term => source.includes(term.slice(0, 5))).length / words.length >= 0.6;
}

function extract(text) {
    const first = [...segmenter.segment(text)].map(({ segment }) => segment.trim()).find(sentence => sentence.split(/\s+/).length >= 6);
    return (first ?? text).slice(0, 400);
}

// Draft one note per section. A model note that is not grounded is replaced by the section's first sentence.
function generateNotes(markdown, { generate } = {}) {
    return exclusive(async () => {
        const run = generate ?? ((heading, text) => chat([{ role: 'system', content: system }, ...example, { role: 'user', content: `Section: ${heading}\nText: ${text.slice(0, 900)}` }], 80));
        const notes = [];
        for (const { heading, text } of sections(markdown)) {
            const candidate = clean(await run(heading, text));
            const usable = candidate.length >= 30 && candidate.length <= 400 && grounded(candidate, text);
            notes.push({ heading, body: usable ? candidate : extract(text), source: 'generated', method: usable ? 'model' : 'extract' });
        }
        return notes;
    });
}

module.exports = { generateNotes, grounded, sections };
