const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { promisify } = require('node:util');
const { gradeAnswer, predictRubricScores } = require('./short-answer-grader');

const run = promisify(execFile);

test('matches the Python grader across the held-out answers', async t => {
    const directory = join(__dirname, 'grader');
    const heldOut = readFileSync(join(directory, 'heldout.jsonl'), 'utf8').trim().split('\n');
    const answers = heldOut.map(line => JSON.parse(line).answer);
    answers.push('DON’T change the identifier.', '🔑', 'same key same key');
    let reference;
    try {
        reference = await run('python3', ['-B', '-c', `
import json
import sys
from pathlib import Path
from grader import neural_grader

predict = neural_grader(json.loads(Path('model.json').read_text(encoding='utf-8')))
print(json.dumps([predict(answer) for answer in json.loads(sys.argv[1])]))
`, JSON.stringify(answers)], { cwd: directory, encoding: 'utf8', timeout: 5000 });
    } catch (error) {
        if (error.code === 'ENOENT') return t.skip('Install Python 3 to compare the two inference runtimes.');
        throw error;
    }

    const predictions = JSON.parse(reference.stdout);
    assert.equal(predictions.length, answers.length);
    for (const [index, answer] of answers.entries()) {
        const [marks, scores] = predictions[index];
        const actual = gradeAnswer(answer);
        assert.deepEqual(actual.points.map(point => Number(point.awarded)), marks, answer);
        assert.equal(actual.score, marks.reduce((sum, mark) => sum + mark, 0), answer);
        assert.equal(actual.maxScore, marks.length, answer);
        for (const [point, score] of predictRubricScores(answer).entries()) {
            assert.ok(Math.abs(score - scores[point]) < 1e-12, answer);
        }
    }
});
