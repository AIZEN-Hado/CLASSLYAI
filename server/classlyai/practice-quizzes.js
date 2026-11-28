// A new lesson revision needs its own reviewed questions and answer key.
const quizzes = new Map([
    ['c1a55000-0000-4000-8000-000000000301', [
        { prompt: 'A purchase transaction rolls back. What happens to the enrollment and receipt it created?',
            options: ['Both writes are discarded.', 'Only the receipt is discarded.', 'Both writes are committed.'], correct: 0 },
        { prompt: 'A client loses the response after a purchase commits. How should it retry?',
            options: ['Create a new purchase ID.', 'Reuse the original idempotency key.', 'Increase the connection pool size.'], correct: 1 }
    ]],
    ['c1a55000-0000-4000-8000-000000000302', [
        { prompt: 'When should retrieval filter passages by course membership?',
            options: ['After generating the answer.', 'Only when opening a citation.', 'Before ranking candidate passages.'], correct: 2 },
        { prompt: 'Three of four relevant passages appear in the first five results. What is recall at five?',
            options: ['60%', '75%', '80%'], correct: 1 }
    ]]
]);

module.exports = { quizzes };
