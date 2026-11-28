const { chat, queued } = require('./quiz-generator');
const { score } = require('./runtime');

const system = 'You mark one rubric point on a student answer. Reply with one word: yes if the answer clearly states what the rubric point requires, otherwise no. A related but different statement is no.';

// Rubric points are written as what a correct answer says, so the checker sees them in that form.
const criterion = description => `The answer says ${description.trim().replace(/^the answer says\s+/i, '')}`;

// The local judge decides each mark. The fine-tuned encoder is a second opinion, and a disagreement is flagged for review.
async function checkAnswer(points, answer, { judge, encode } = {}) {
    const decide = judge ?? (async (text, student) => /^yes/i.test((await chat([
        { role: 'system', content: system },
        { role: 'user', content: `Rubric point: ${text}\nStudent answer: ${student}` },
    ], 3)).trim()));
    const second = encode ?? (async (text, student) => (await score('grader', [[text, student]]))[0]);

    return queued(async () => {
        const marks = [];
        for (const description of points) {
            const text = criterion(description);
            const awarded = await decide(text, answer);
            const encoderScore = await second(text, answer);
            marks.push({ awarded, encoderScore: Number(encoderScore.toFixed(4)), flagged: awarded !== (encoderScore >= 0.5) });
        }
        return marks;
    });
}

module.exports = { checkAnswer, criterion };
