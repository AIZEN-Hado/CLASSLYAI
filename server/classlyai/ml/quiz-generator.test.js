const assert = require('node:assert/strict');
const { test } = require('node:test');
const { courses } = require('../../db/demo-classroom');
const { validateQuestions } = require('../practice-quizzes');
const { acceptable, candidates, generateQuiz, parseDraft } = require('./quiz-generator');

const [{ lesson }] = courses;

test('only drafts whose answer is quoted from the lesson sentence are acceptable', () => {
    const sentence = 'Use an idempotency key to recognize a retried request and return the original result.';
    const good = parseDraft('Sure! {"question":"What recognizes a retried request?","answer":"an idempotency key","distractors":["a pool size","a lease"]}');
    assert.equal(acceptable(good, sentence), true);
    assert.equal(acceptable({ ...good, answer: 'a database lock' }, sentence), false);
    assert.equal(acceptable({ ...good, question: 'Name it' }, sentence), false);
    assert.equal(parseDraft('not json'), null);
    assert.equal(acceptable({ ...good, question: 'What happens if it stops?' }, sentence), false);
    assert.equal(acceptable({ ...good, question: 'Which idempotent step recognizes a retried request?' }, sentence), false);
    assert.equal(acceptable({ ...good, answer: 'key' }, sentence), false);
});

test('candidate sentences spread across sections and skip short or code lines', () => {
    const picked = candidates(lesson.markdown);
    assert.ok(picked.length >= 6);
    assert.equal(new Set(picked.slice(0, 6).map(item => item.section)).size, 6);
    assert.ok(picked.every(item => item.sentence.split(/\s+/).length >= 8));
});

test('generated questions are grounded, well-formed and pass instructor validation', async () => {
    const generate = async (section, sentence) => JSON.stringify({
        question: `What does the lesson say in its section on ${section.toLowerCase()}?`,
        answer: sentence.replace(/[.]$/, '').split(' ').slice(-3).join(' '),
        distractors: ['increase the pool size', 'create a new purchase']
    });
    const questions = await generateQuiz(lesson.markdown, { count: 3, generate });
    assert.equal(questions.length, 3);
    for (const question of questions) {
        assert.equal(question.options.length, 3);
        assert.equal(new Set(question.options).size, 3);
        assert.equal(question.source, 'generated');
        assert.ok(lesson.markdown.toLowerCase().includes(question.options[question.correct].toLowerCase()));
    }
    assert.ok(validateQuestions(questions));
});

test('ungrounded model output yields no questions', async () => {
    const generate = async () => JSON.stringify({ question: 'What colour is the sky today?', answer: 'blue', distractors: ['red', 'green'] });
    assert.deepEqual(await generateQuiz(lesson.markdown, { generate }), []);
});
