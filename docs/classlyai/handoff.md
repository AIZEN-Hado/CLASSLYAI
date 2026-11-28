# ClasslyAI session handoff

Use this file as the current checkpoint. It contains the context a fresh session needs to start work from the checkout.

## Current checkpoint

| Item | Status |
| --- | --- |
| Product | ClasslyAI, a course workspace with an evidence-backed tutor. |
| Scope | Seeded overnight demo, with React and Express retained and Neon replacing MongoDB for the new workflow. |
| Baseline | Legacy Skill Path source at `a4f7d02`. Use `server/classlyai/index.js` for the PostgreSQL-backed ClasslyAI API. |
| Completed | Seeded portfolio demo with PostgreSQL sessions, versioned publishing, durable indexing, scoped hybrid retrieval, cited tutor, evaluation, student lesson progress, revision-specific quizzes with downloadable score PDFs, a fine-tuned local short-answer grader, and a local neural tutor reranker. The tutor no longer calls any hosted LLM API. |
| Active phase | Phase 5, model slice finished but uncommitted (see Next action). The seeded Neon demo has migration 006. Commit `93bc612` contains downloadable quiz results and the short-answer grader trained on Runpod. |
| Verification so far | Model results are in [models/README.md](../../server/classlyai/models/README.md). Blind synthetic set (40, hash-locked before training): fine-tuned encoder 35/40 exact score with 2 false full-credit cases, versus 26/40 and 3 for the previous MLP and 22/40 and 0 for keywords. Held-out lessons (25 answerable, 7 unsupported): reranker top-1 0.96 versus 0.84 keyword and 0.72 hybrid, 23/25 correct answers and 6/7 abstentions. Seeded Neon benchmark through the new tutor: 9/9 cited sections, 3/3 abstentions, both isolation checks, no provider credentials. Server tests (6) and the client build passed. An HTTP-level smoke test against the seeded Neon demo (student A, built API with the local models, no provider credentials) passed login, a cited answer with a working citation lookup, abstention, quiz grading, a real PDF download and a 2/2 short-answer mark. It wrote one quiz result for the seeded student. A browser UI run (Chromium driven by browser-use, desktop width, built client against seeded Neon) also passed: sign-in, a cited answer with its source section, abstention text, a retaken quiz showing 2 of 2, a 2/2 tentative short-answer mark, and a 2,166-byte `application/pdf` download from the page's link. Not run: mobile width, and the PDF was fetched from the page's link rather than saved through the browser's download UI. The local network sometimes failed to connect to Neon; `NODE_OPTIONS="--dns-result-order=ipv4first --network-family-autoselection-attempt-timeout=5000"` fixed it. Mobile Chrome against seeded Neon verified retaking the quiz, score persistence after reload, a PDF download, and two tentative rubric marks from the local grader. The local pgvector fixture passed nine tests and mobile Chrome verified a real PDF download, saved quiz score after reload, and tentative per-point neural feedback. The Runpod and local model files had identical SHA-256 hashes. All eight server tests passed on PostgreSQL 16 with array search and again with pgvector 0.8.7. The ClasslyAI client lint and production build passed. Mobile Chrome verified quiz submission, retake, and score persistence after reload against a freshly migrated PostgreSQL 16 fixture. A second mobile Chrome run against the seeded Neon database scored 1/2, retook the quiz for 2/2, and confirmed 2/2 after reload. Chrome verified resume, completion, reload, and reopening on mobile. The earlier browser check covered citations, focus, and instructor publishing. The fixture benchmark cited the expected section in 9/9 cases, abstained in 3/3 cases, and passed both isolation checks. |
| Environment | Fixture mode passed on local PostgreSQL 16 with both search engines and on Neon PostgreSQL 18.7 with native pgvector 0.8.7. The Neon database has six applied migrations and both demo lessons indexed. The existing optional live provider path is outside the new direction. |
| Data | Use seeded courses. Existing MongoDB data and production cutover are outside the demo boundary. |
| Git checkpoints | The user runs the staging, commit, and push commands supplied by the assistant after each completed step. |
| GitHub repository | The `classlyai` remote is configured and `main` tracks `classlyai/main`. |

## Resume from here

1. Run `git status --short --branch` and `git log -8 --oneline` in the checkout. On another machine, clone the dedicated ClasslyAI repo once it is available and check out the branch with the checkpoint commits.
2. Read the [delivery plan](roadmap.md) and [architecture](architecture.md). Follow the active phase and update this checkpoint once its next action changes.
3. **Next action.** Commit the model slice, collect independently instructor-marked answers to replace the synthetic labels (marks stay advisory until then), and deploy once a dedicated host and HTTPS origin exist (none is configured). Optionally repeat the browser check at mobile width. The UI follows a "reading room" direction: warm paper (#f3eee4), ink (#1b1a17) and one vermilion signal (#c8452a) used only for citations, focus and the active-nav marker. Type is self-hosted Fraunces, Geist and Geist Mono via `@fontsource-variable`. The sign-in page shows an engraved ink-line sphere on canvas (`SignInScene.jsx`) whose marked points carry lesson-section labels; loading states use a 2D-canvas orb loader (`OrbLoader.jsx`) and nowhere else. Both are static under `prefers-reduced-motion`. Structure lives in `classroom.css`, the design layer in `editorial.css`. Known quality note: the extractive tutor often cites a correct passage but quotes its first sentence rather than the one that answers the question.
4. Use the roadmap for Phase 5 expansion. Keep applied migration files intact and put schema changes in a new numbered SQL file.

## Feature port from the original Classly (in progress)

The user wants the original Classly features added to ClasslyAI on Neon, not a rebuild and not a return to MongoDB. Order: instructor quiz builder, quiz generation, notes generation with saved tutor chats, assignments with an auto-checker. Generation uses trained local networks, and instructor edits and overrides are saved as labelled data for a gated retrain, since a live self-modifying model is out of scope.

- **Done: instructor quiz builder.** Migration 007 adds `classlyai.quiz_questions` per lesson revision with a trigger that locks a published revision's questions. `practice-quizzes.js` now loads from the database, `lesson-editor.js` has `GET` and `PUT <lesson>/quiz`, a new draft revision inherits the previous questions, and the editor shows a quiz form. The seeded questions moved into `db/demo-classroom.js` and the seed inserts them. Verified against Neon: students read the seeded quiz, students cannot edit (404), published revisions reject edits (409), invalid payloads return 400, drafts inherit and save, and students keep the published quiz. The test draft was removed afterwards. Not run: the PostgreSQL-backed `api.test.js` (no test database here) and saving a quiz through the browser UI.
- **Done: quiz generation.** `POST <lesson>/quiz/generate` drafts up to three questions with a pretrained Qwen2.5-1.5B-Instruct (ONNX, int4) run locally through the existing Transformers.js runtime, then keeps only drafts whose answer is quoted from the lesson sentence, whose question does not contain its answer or a dangling pronoun, whose distractors are not near-synonyms, and which the trained reranker confirms are about the source passage. Nothing is saved until the instructor edits and saves with `PUT`; saved rows keep `source = 'generated'`. The editor has a "Draft with the local model" button with the orb loader. On the six held-out lessons it drafted 8 of 12 requested questions and 2 of 4 lessons got a full three (first filter pass: 12 of 12, but with near-synonym distractors, self-answering stems and stopword answers; the final filters trade yield for cleaner questions). Each quiz takes roughly 75 to 115 s on this CPU. The model is not fine-tuned. First use downloads about 1.5 GB into the git-ignored `server/.cache/models`. Quality is uneven, so every draft needs an instructor's reading. Run `node classlyai/eval/models.js quiz` to reproduce.
- **Done: saved tutor chats.** Migration 008 adds `tutor_conversations` and `tutor_messages` (answers stored as `{status, claims, citations}`, up to 50 exchanges per chat). `POST <course>/tutor` accepts an optional `conversationId`, stores the exchange and returns the id; `GET <course>/conversations`, `GET .../conversations/:id` and `DELETE` are scoped to the owning student and course. The tutor panel is now a thread with an Earlier chats list, New chat and per-chat delete. Verified on Neon: save, follow-up in the same chat, list, open with citations, another student gets 404, a different course path gets 404, an invalid id gets 400, appending to someone else's chat is refused, delete works; and in the browser: two exchanges, new chat, reopen. Test data was removed. A saved citation opens only while its revision is still published.
- **Done: study notes.** Migration 009 adds `lesson_notes` per revision with the same published-revision lock. Students see the notes under the lesson; instructors write them in the editor or draft them with the local model (`POST <lesson>/notes/generate`, one note per section). A model note is kept only if most of its content words appear in its section; otherwise the section's first sentence is used. New draft revisions inherit the previous notes. Quiz and notes drafting share one model and one lock (`exclusive` in `models/quiz-generator.js`, 429 if busy). Verified on Neon: students read the seeded notes, students cannot edit (404), published notes reject edits (409), invalid notes return 400, a draft inherits and saves generated notes, and students keep the published ones; a live draft took 66 s for six sections and gave a mix of good notes and fallback first sentences. Browser-checked the student view and the locked editor. Seeded notes were written by hand. No yield study beyond that one lesson, and the generated note quality is unmeasured by an instructor.
- **Done: assignments with an auto-checker.** Migration 010 adds assignments, rubric points, one current submission per student and per-point marks (`auto_awarded`, `encoder_score`, `flagged`, `final_awarded`). `assignments.js` has create (instructor), list, view, submit (student, rate-limited, queued behind any running model job) and review (instructor). The local model judges each point; the fine-tuned encoder is a second opinion and a disagreement is flagged. Students see their marks as advisory until an instructor reviews them. The UI adds an Assignments list on the course page, a creation form, a student submit page with the orb loader, and an instructor review page with flagged points highlighted. Verified on Neon with 14 API checks (validation, role checks, outsider 404, submit, advisory marks, review override, reviewed view, list counts) and in the browser end to end; one live check showed a judge false credit that the flag caught. Test data was removed. Measurements are in `server/classlyai/models/README.md`.
- **Done: labelled-example loop.** `npm run export:labels` exports reviewed marks and `train.py grader OUT labels.jsonl` adds them to the final fit. It is a manual, gated retrain by design: no live self-modification, and the new model ships only if it matches the current one on the blind and checker sets. No retrain has been run because there are no real labels yet.
- **Not done from the original app:** marketplace, coupons, reviews, payouts, notifications, broadcasts, course analytics and the teacher AI-provider settings, none of which were requested.

## Decisions to carry to the next account

- Train or fine-tune task-specific neural networks and run inference locally. Pretrained weights are allowed. The target product runs without hosted LLM APIs. The OpenAI paths are removed; embeddings stay the deterministic hash fixture and the tutor reranks locally.
- After the grader experiment, evaluate a separate neural reranker on held-out lessons against keyword and existing hybrid retrieval. Preserve enrollment checks, exact citations, and abstention. Keep the existing fixture benchmark as a regression check.
- The user authorized a total of $1 for Runpod training and related resources. Spend so far is about $0.68 by account balance (a $0.0006 CPU run, then two GPU-pod sessions, one wasted on a broken ONNX export). All pods were terminated and no volume or endpoint of ours remains; an unrelated exited pod and 10 GB volume on the same account belong to another project and were left alone. About $0.32 of the cap remains. Verify spend before another rental. Use low or medium reasoning effort for delegated agents, including Astra.
- Commit `e1f9c41` records the Neon verification. Migration 006 is applied to the seeded Neon demo. The PDF download and local grader were verified through a locally served build. Public hosting is pending.
- On a new machine or account, open this checkout or clone the dedicated `classlyai` remote. Restore access to Neon and Runpod through their account controls, and load the ignored `server/.env` from the approved secret store if needed.

## Connect the GitHub repository

1. Create an empty `classlyai` repository under your GitHub account. Keep the README, license, and `.gitignore` options unchecked because the checkout already has Git history.
2. From this checkout, run `git remote add classlyai https://github.com/YOUR_GITHUB_USERNAME/classlyai.git` with your username. Verify the destination with `git remote get-url classlyai`.
3. Commit the reviewed steps locally. Then run `git push -u classlyai main` to publish those commits. Subsequent pushes use `git push classlyai main`.

For a fresh checkout, `git clone -o classlyai https://github.com/YOUR_GITHUB_USERNAME/classlyai.git` keeps the same remote name. [GitHub import instructions](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)

## Local configuration

The ClasslyAI database commands use the PostgreSQL variables below. The legacy app entry point uses `MONGO_URI`.

| Variable | Where to get it |
| --- | --- |
| `DATABASE_URL` | Pooled connection string for the Neon development branch from **Connect**. |
| `DATABASE_URL_DIRECT` | Direct connection string for that branch, with connection pooling turned off in **Connect**. Use it for migrations. |
| `CLASSLYAI_ORIGIN` | The origin from which the app makes API requests. Local default is `http://localhost:5001`. Production requires an HTTPS origin. |
| `CLASSLYAI_PORT` | Optional API port. Defaults to the host-provided `PORT` or `5001`. |
| `CLASSLYAI_TEST_DATABASE_URL` | Isolated PostgreSQL server where the caller can create test databases. Required for the database-backed tests. |

Keep values in the ignored `server/.env` or the deployment secret store. A fresh machine needs its own copy from the secret store. Verify the configured Git author before the first commit on another machine if the intended GitHub attribution changes.

## Seed the demo classroom

After migrating an isolated development database, add three distinct passwords to `server/.env`. The seed uses `DATABASE_URL` and needs write access to the `classlyai` schema.

| Demo account | Password variable | Course access |
| --- | --- | --- |
| `instructor@classlyai.example` | `CLASSLYAI_DEMO_INSTRUCTOR_PASSWORD` | Instructor in both courses |
| `student-a@classlyai.example` | `CLASSLYAI_DEMO_STUDENT_A_PASSWORD` | Reliable Backend Systems |
| `student-b@classlyai.example` | `CLASSLYAI_DEMO_STUDENT_B_PASSWORD` | Evaluating Search Systems |

Use passwords of at least 12 characters and at most 72 UTF-8 bytes. Run `npm run db:seed --prefix server`. Rerunning the seed preserves existing demo credentials, revoked memberships, and withdrawn revisions.

## Start the ClasslyAI API

Run `npm run classlyai:worker --prefix server` in one terminal and `npm run classlyai:start --prefix server` in another. The API serves the built UI when `client/dist/index.html` exists. `GET /api/health` reports availability. `POST /api/auth/login` accepts JSON `email` and `password` and sets a session cookie. `GET /api/auth/me` returns the signed-in user, and `POST /api/auth/logout` revokes the current session. For manual POST requests, send the `Origin` header matching `CLASSLYAI_ORIGIN`.

Use `GET /api/courses` to list the signed-in user’s courses, `GET /api/courses/:courseSlug` for published lesson links, and `GET /api/courses/:courseSlug/lessons/:lessonSlug` for lesson content. `GET /api/courses/:courseSlug/instructor` returns revision pointers for that course’s instructors.

## Resume prompt

> Continue ClasslyAI from `docs/classlyai/handoff.md`. Read `AGENTS.md`, the roadmap, and the architecture. Inspect the working tree and start with the recorded next action. After each small, verified step, give me the exact staging, commit, and push commands to run. Update the checkpoint before handing back. Use the seeded Neon demo scope and follow the decisions above.

When updating the checkpoint, record the active phase, completed slice, checks that passed or failed, any blocker, and the next concrete command or file to work on. Link to a commit or pull request when it helps locate the work.
