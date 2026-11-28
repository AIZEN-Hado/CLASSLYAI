const users = [
    {
        id: 'c1a55000-0000-4000-8000-000000000001',
        email: 'instructor@classlyai.example',
        name: 'Maya Rao',
        passwordVariable: 'CLASSLYAI_DEMO_INSTRUCTOR_PASSWORD'
    },
    {
        id: 'c1a55000-0000-4000-8000-000000000002',
        email: 'student-a@classlyai.example',
        name: 'Nikhil Sen',
        passwordVariable: 'CLASSLYAI_DEMO_STUDENT_A_PASSWORD'
    },
    {
        id: 'c1a55000-0000-4000-8000-000000000003',
        email: 'student-b@classlyai.example',
        name: 'Leena Thomas',
        passwordVariable: 'CLASSLYAI_DEMO_STUDENT_B_PASSWORD'
    }
];

const [instructor, studentA, studentB] = users;

const courses = [
    {
        id: 'c1a55000-0000-4000-8000-000000000101',
        slug: 'reliable-backend-systems',
        title: 'Reliable Backend Systems',
        summary: 'Reason about concurrent writes, retries, and partial failure.',
        studentId: studentA.id,
        lesson: {
            id: 'c1a55000-0000-4000-8000-000000000201',
            revisionId: 'c1a55000-0000-4000-8000-000000000301',
            slug: 'transactions-and-retries',
            title: 'Transactions and retries',
            quiz: [
                { prompt: 'A purchase transaction rolls back. What happens to the enrollment and receipt it created?',
                    options: ['Both writes are discarded.', 'Only the receipt is discarded.', 'Both writes are committed.'], correct: 0 },
                { prompt: 'A client loses the response after a purchase commits. How should it retry?',
                    options: ['Create a new purchase ID.', 'Reuse the original idempotency key.', 'Increase the connection pool size.'], correct: 1 }
            ],
            notes: [
                { heading: 'Atomic writes', body: 'A transaction commits its writes together. If a purchase fails partway, rolling back discards both the enrollment and the receipt.' },
                { heading: 'Retrying a request', body: 'A client can lose the response after the server commits. An idempotency key lets the server recognize the retry and return the original result.' },
                { heading: 'Queue leases', body: 'A worker claims a job with a lease. If the worker stops, the lease expires and another worker can take the job.' }
            ],
            markdown: `## Atomic writes

A transaction commits its writes together. Rolling back a transaction discards its writes. If a course purchase creates an enrollment and a receipt in one transaction, a failure rolls back both records.

## Retrying a request

A client can lose the response after the server commits. Use an idempotency key to recognize a retried request and return the original result. A unique constraint on the key makes concurrent requests contend for the same record.

## Isolation

Verify concurrency behavior with two database sessions. Start both operations before either finishes and check the persisted outcome after both return.

## Connection budgets

Divide the database connection budget across the API and worker processes. Measure how long requests wait to borrow a connection before increasing the pool size.

## Queue leases

A worker claims a job with a lease. If the process stops before returning a result, the lease expires and another worker can take the job.

## Indexing costs

Indexes let a database locate records efficiently. Each extra index also adds work when the database writes a record. Measure query latency and write overhead before creating an index.`
        }
    },
    {
        id: 'c1a55000-0000-4000-8000-000000000102',
        slug: 'evaluating-search-systems',
        title: 'Evaluating Search Systems',
        summary: 'Measure retrieval quality and verify access boundaries with fixtures.',
        studentId: studentB.id,
        lesson: {
            id: 'c1a55000-0000-4000-8000-000000000202',
            revisionId: 'c1a55000-0000-4000-8000-000000000302',
            slug: 'retrieval-benchmarks',
            title: 'Retrieval benchmarks and isolation',
            quiz: [
                { prompt: 'When should retrieval filter passages by course membership?',
                    options: ['After generating the answer.', 'Only when opening a citation.', 'Before ranking candidate passages.'], correct: 2 },
                { prompt: 'Three of four relevant passages appear in the first five results. What is recall at five?',
                    options: ['60%', '75%', '80%'], correct: 1 }
            ],
            notes: [
                { heading: 'Retrieval recall', body: 'Recall at five is the fraction of relevant passages found in the first five results. Label the relevant passages first and compare methods on the same questions.' },
                { heading: 'Isolation', body: 'Filter candidate passages by course membership before ranking, so a similar passage from another course never appears in results or citations.' },
                { heading: 'Unsupported questions', body: 'Test questions the course cannot answer, and record whether the tutor says the evidence is insufficient.' }
            ],
            markdown: `## Retrieval recall

Recall at five is the fraction of relevant passages that appear in the first five results. Label relevant passages before running the benchmark. Compare ranking methods using the same questions and document corpus.

## Isolation

Filter candidate passages by course membership before ranking. Include a highly similar passage from a course the student cannot access. The passage must stay out of retrieval results and citation lookups.

## Unsupported questions

Include questions that the course material cannot answer. Record whether the tutor says evidence is insufficient and inspect any citations it returns.

## Latency logging

Time embedding, retrieval, and response generation separately. Record a request identifier and stage timings so an engineer can investigate a slow response.

## Passage length

Split lesson text at section boundaries. If sections are long, preserve the original offsets while making each passage short enough to retrieve independently.

## Synthetic corpora

Include several passages about related topics in the fixture corpus. They make a search benchmark harder because the first result can sound relevant while discussing a different concept.`
        }
    }
];

module.exports = { users, instructorId: instructor.id, courses };
