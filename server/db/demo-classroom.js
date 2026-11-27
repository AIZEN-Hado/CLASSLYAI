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
            markdown: `## Atomic writes

A transaction commits its writes together. Rolling back a transaction discards its writes. If a course purchase creates an enrollment and a receipt in one transaction, a failure rolls back both records.

## Retrying a request

A client can lose the response after the server commits. Use an idempotency key to recognize a retried request and return the original result. A unique constraint on the key makes concurrent requests contend for the same record.

## Isolation

Verify concurrency behavior with two database sessions. Start both operations before either finishes and check the persisted outcome after both return.`
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
            markdown: `## Retrieval recall

Recall at five is the fraction of relevant passages that appear in the first five results. Label relevant passages before running the benchmark. Compare ranking methods using the same questions and document corpus.

## Isolation

Filter candidate passages by course membership before ranking. Include a highly similar passage from a course the student cannot access. The passage must stay out of retrieval results and citation lookups.

## Unsupported questions

Include questions that the course material cannot answer. Record whether the tutor says evidence is insufficient and inspect any citations it returns.`
        }
    }
];

module.exports = { users, instructorId: instructor.id, courses };
