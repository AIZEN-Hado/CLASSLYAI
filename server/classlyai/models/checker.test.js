const assert = require('node:assert/strict');
const { test } = require('node:test');
const { validateAssignment } = require('../assignments');
const { checkAnswer, criterion } = require('./checker');

test('rubric points are phrased as what a correct answer says, without doubling the prefix', () => {
    assert.equal(criterion('the server returns the saved result'), 'The answer says the server returns the saved result');
    assert.equal(criterion('The answer says the server returns the saved result'), 'The answer says the server returns the saved result');
});

test('a mark is flagged exactly when the judge and the encoder disagree, in rubric order', async () => {
    const judge = async text => !text.includes('second');
    const encode = async text => (text.includes('first') ? 0.9 : text.includes('second') ? 0.1 : 0.2);
    const marks = await checkAnswer(['the first point', 'the second point', 'the third point'], 'an answer', { judge, encode });
    assert.deepEqual(marks.map(mark => mark.awarded), [true, false, true]);
    assert.deepEqual(marks.map(mark => mark.flagged), [false, false, true]);
    assert.ok(marks.every(mark => mark.encoderScore >= 0 && mark.encoderScore <= 1));
});

test('assignment input is validated at the trust boundary', () => {
    const valid = { title: ' Retry ', prompt: 'Explain.', points: ['a point'] };
    assert.deepEqual(validateAssignment(valid), { title: 'Retry', prompt: 'Explain.', points: ['a point'] });
    assert.equal(validateAssignment({ ...valid, points: [] }), null);
    assert.equal(validateAssignment({ ...valid, points: Array(7).fill('x') }), null);
    assert.equal(validateAssignment({ ...valid, points: ['  '] }), null);
    assert.equal(validateAssignment({ ...valid, title: '' }), null);
    assert.equal(validateAssignment({ ...valid, prompt: 'x'.repeat(2001) }), null);
    assert.equal(validateAssignment(null), null);
});
