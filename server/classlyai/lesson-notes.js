const maxNotes = 12;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadNotes(db, revisionId) {
    if (typeof revisionId !== 'string' || !uuidPattern.test(revisionId)) return [];
    const { rows } = await db.query('SELECT heading, body, source FROM classlyai.lesson_notes WHERE revision_id = $1 ORDER BY ordinal', [revisionId]);
    return rows;
}

// Trust boundary: instructor input must be a short list of headed paragraphs.
function validateNotes(input) {
    if (!Array.isArray(input) || input.length < 1 || input.length > maxNotes) return null;
    const notes = [];
    for (const item of input) {
        const heading = typeof item?.heading === 'string' ? item.heading.trim() : '';
        const body = typeof item?.body === 'string' ? item.body.trim() : '';
        if (!heading || heading.length > 120 || !body || body.length > 600 || `${heading}${body}`.includes('\0')) return null;
        notes.push({ heading, body, source: item.source === 'generated' ? 'generated' : 'manual' });
    }
    return notes;
}

async function replaceNotes(client, revisionId, notes) {
    await client.query('DELETE FROM classlyai.lesson_notes WHERE revision_id = $1', [revisionId]);
    for (const [index, { heading, body, source }] of notes.entries()) {
        await client.query('INSERT INTO classlyai.lesson_notes (revision_id, ordinal, heading, body, source) VALUES ($1, $2, $3, $4, $5)', [revisionId, index + 1, heading, body, source]);
    }
}

module.exports = { loadNotes, replaceNotes, validateNotes };
