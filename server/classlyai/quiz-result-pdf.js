const { buffer } = require('node:stream/consumers');
const PDFDocument = require('pdfkit');

function createQuizResultPdf({ courseTitle, lessonTitle, studentName, score, answers, submittedAt, questions }) {
    const doc = new PDFDocument({
        size: 'A4',
        margin: 54,
        info: { Title: 'Practice quiz result', Author: 'ClasslyAI' },
    });

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#245641').text('ClasslyAI');
    doc.moveDown(0.65).fontSize(24).fillColor('#182920').text('Practice quiz result');
    doc.moveDown(0.5).font('Helvetica').fontSize(12).text(courseTitle).text(lessonTitle);
    doc.moveDown(0.8).text(`Student: ${studentName}`);
    if (submittedAt) {
        const date = submittedAt.toISOString().slice(0, 19).replace('T', ' ');
        doc.text(`Submitted: ${date} UTC`);
    }
    doc.moveDown(0.8).font('Helvetica-Bold').fontSize(16).text(`Score: ${score} of ${questions.length}`);

    if (answers) {
        for (const [index, { prompt, options, correct }] of questions.entries()) {
            const selected = answers[index];
            doc.moveDown(1).font('Helvetica-Bold').fontSize(12).text(`${index + 1}. ${prompt}`);
            doc.moveDown(0.35).font('Helvetica').fontSize(11)
                .text(`Your answer: ${options[selected]} (${selected === correct ? 'Correct' : 'Incorrect'})`)
                .text(`Correct answer: ${options[correct]}`);
        }
    } else {
        doc.moveDown().font('Helvetica').fontSize(11).text('Answer details and submission date are unavailable for this result.');
    }

    const pdf = buffer(doc);
    doc.end();
    return pdf;
}

module.exports = { createQuizResultPdf };
