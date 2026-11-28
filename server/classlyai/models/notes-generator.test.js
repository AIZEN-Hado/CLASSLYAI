const assert = require('node:assert/strict');
const { test } = require('node:test');
const { courses } = require('../../db/demo-classroom');
const { validateNotes } = require('../lesson-notes');
const { generateNotes, grounded, sections } = require('./notes-generator');

const [{ lesson }] = courses;

test('a note is grounded only when most of its content words come from the section', () => {
    const text = 'A client can lose the response after the server commits. Use an idempotency key to recognize a retried request and return the original result.';
    assert.equal(grounded('Use an idempotency key so a retried request returns the original result.', text), true);
    assert.equal(grounded('Databases replicate data across several regions for durability.', text), false);
    assert.equal(grounded('It works well.', text), false);
});

test('sections are grouped by heading in lesson order', () => {
    assert.deepEqual(sections(lesson.markdown).map(item => item.heading).slice(0, 3), ['Atomic writes', 'Retrying a request', 'Isolation']);
});

test('grounded model notes are kept and ungrounded ones fall back to the section text', async () => {
    const generate = async heading => (heading === 'Isolation'
        ? 'Quantum computers factor large primes much faster than classical machines can.'
        : `Remember that ${sections(lesson.markdown).find(item => item.heading === heading).text.split('. ')[0].toLowerCase()}.`);
    const notes = await generateNotes(lesson.markdown, { generate });
    assert.equal(notes.length, 6);
    const isolation = notes.find(note => note.heading === 'Isolation');
    assert.equal(isolation.method, 'extract');
    assert.ok(lesson.markdown.includes(isolation.body));
    assert.ok(notes.filter(note => note.method === 'model').length >= 4);
    assert.ok(validateNotes(notes));
});
