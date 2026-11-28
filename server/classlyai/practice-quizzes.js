const maxQuestions = 10;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Questions belong to one lesson revision, so a new revision needs its own reviewed answer key.
async function loadQuiz(db, revisionId) {
    if (typeof revisionId !== 'string' || !uuidPattern.test(revisionId)) return null;
    const { rows } = await db.query(`
        SELECT prompt, options, correct, source FROM classlyai.quiz_questions
        WHERE revision_id = $1 ORDER BY ordinal
    `, [revisionId]);
    return rows.length ? rows : null;
}

// Trust boundary: instructor input must be a short list of well-formed multiple-choice questions.
function validateQuestions(input) {
    if (!Array.isArray(input) || input.length < 1 || input.length > maxQuestions) return null;
    const questions = [];
    for (const item of input) {
        const prompt = typeof item?.prompt === 'string' ? item.prompt.trim() : '';
        const options = Array.isArray(item?.options) ? item.options.map(option => (typeof option === 'string' ? option.trim() : '')) : [];
        if (!prompt || prompt.length > 300 || prompt.includes('\0')) return null;
        if (options.length < 2 || options.length > 6 || options.some(option => !option || option.length > 200 || option.includes('\0'))) return null;
        if (new Set(options.map(option => option.toLowerCase())).size !== options.length) return null;
        if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct >= options.length) return null;
        questions.push({ prompt, options, correct: item.correct, source: item.source === 'generated' ? 'generated' : 'manual' });
    }
    return questions;
}

async function replaceQuiz(client, revisionId, questions) {
    await client.query('DELETE FROM classlyai.quiz_questions WHERE revision_id = $1', [revisionId]);
    for (const [index, { prompt, options, correct, source }] of questions.entries()) {
        await client.query(`
            INSERT INTO classlyai.quiz_questions (revision_id, ordinal, prompt, options, correct, source)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [revisionId, index + 1, prompt, options, correct, source]);
    }
}

module.exports = { loadQuiz, replaceQuiz, validateQuestions };
