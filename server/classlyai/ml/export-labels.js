// Prints instructor-reviewed marks as JSONL training examples: node classlyai/ml/export-labels.js > labels.jsonl
// Only reviewed submissions are exported. `changed` is true where the instructor overrode the model's decision.
const { createPostgresPool } = require('../../db/postgres');
const { criterion } = require('./checker');

async function main() {
    const pool = createPostgresPool();
    try {
        const { rows } = await pool.query(`
            SELECT point.description, submission.answer, mark.final_awarded AS label, mark.final_awarded <> mark.auto_awarded AS changed
            FROM classlyai.submission_marks AS mark
            JOIN classlyai.submissions AS submission ON submission.id = mark.submission_id AND submission.reviewed_at IS NOT NULL
            JOIN classlyai.assignment_points AS point ON point.assignment_id = submission.assignment_id AND point.ordinal = mark.ordinal
            WHERE mark.final_awarded IS NOT NULL
            ORDER BY submission.reviewed_at, mark.ordinal
        `);
        for (const row of rows) {
            console.log(JSON.stringify({ criterion: criterion(row.description), answer: row.answer, label: Number(row.label), changed: row.changed }));
        }
        console.error(`Exported ${rows.length} reviewed marks, ${rows.filter(row => row.changed).length} overridden.`);
    } finally {
        await pool.end();
    }
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
