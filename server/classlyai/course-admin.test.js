const assert = require('node:assert/strict');
const { test } = require('node:test');
const { joinCode, slugify, validateCourse } = require('./course-admin');

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

test('slugs always satisfy the database pattern, whatever the title looks like', () => {
    assert.equal(slugify('Intro to Message Queues', 'course'), 'intro-to-message-queues');
    assert.equal(slugify('  Café & Crème: déjà vu!! ', 'course'), 'cafe-creme-deja-vu');
    assert.equal(slugify('日本語のコース', 'course'), 'course');
    assert.equal(slugify('---', 'lesson'), 'lesson');
    for (const title of ['A'.repeat(200), 'x - - y', '??? ???', 'Lesson 1: The basics (part 2)']) {
        assert.match(slugify(title, 'course'), slugPattern);
        assert.ok(slugify(title, 'course').length <= 48);
    }
});

test('join codes use only the unambiguous alphabet and are not repeated', () => {
    const codes = new Set(Array.from({ length: 200 }, joinCode));
    assert.ok(codes.size > 195);
    for (const code of codes) assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/);
});

test('course input is trimmed and bounded', () => {
    assert.deepEqual(validateCourse({ title: '  Queues   101 ', summary: ' Brokers. ' }), { title: 'Queues 101', summary: 'Brokers.' });
    assert.deepEqual(validateCourse({ title: 'Queues' }), { title: 'Queues', summary: '' });
    assert.equal(validateCourse({ title: '' }), null);
    assert.equal(validateCourse({ title: 'x'.repeat(121) }), null);
    assert.equal(validateCourse({ title: 'ok', summary: 'x'.repeat(301) }), null);
    assert.equal(validateCourse({ title: 'bad\0title' }), null);
    assert.equal(validateCourse(undefined), null);
});
