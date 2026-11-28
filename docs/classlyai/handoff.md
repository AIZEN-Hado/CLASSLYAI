# ClasslyAI session handoff

Use this file as the current checkpoint. It contains the context a fresh session needs to start work from the checkout.

## Current checkpoint

| Item | Status |
| --- | --- |
| Product | ClasslyAI, a course workspace with an evidence-backed tutor. |
| Scope | Seeded overnight demo, with React and Express retained and Neon replacing MongoDB for the new workflow. |
| Baseline | Legacy Skill Path source at `a4f7d02`. Use `server/classlyai/index.js` for the PostgreSQL-backed ClasslyAI API. |
| Completed | Seeded portfolio demo with PostgreSQL sessions, versioned publishing, durable indexing, scoped hybrid retrieval, cited tutor, evaluation, student lesson progress, and revision-specific practice quizzes with saved latest scores. |
| Active phase | Phase 5. The seeded Neon demo has migration 005. The local API served the matching client build for the quiz check. Public application deployment is pending. |
| Verification so far | All eight server tests passed on PostgreSQL 16 with array search and again with pgvector 0.8.7. The ClasslyAI client lint and production build passed. Mobile Chrome verified quiz submission, retake, and score persistence after reload against a freshly migrated PostgreSQL 16 fixture. A second mobile Chrome run against the seeded Neon database scored 1/2, retook the quiz for 2/2, and confirmed 2/2 after reload. Chrome verified resume, completion, reload, and reopening on mobile. The earlier browser check covered citations, focus, and instructor publishing. The fixture benchmark cited the expected section in 9/9 cases, abstained in 3/3 cases, and passed both isolation checks. |
| Environment | Fixture mode passed on local PostgreSQL 16 with both search engines and on Neon PostgreSQL 18.7 with native pgvector 0.8.7. The Neon database has five applied migrations and both demo lessons indexed. Live OpenAI inference is unverified. |
| Data | Use seeded courses. Existing MongoDB data and production cutover are outside the demo boundary. |
| Git checkpoints | The user runs the staging, commit, and push commands supplied by the assistant after each completed step. |
| GitHub repository | The `classlyai` remote is configured and `main` tracks `classlyai/main`. |

## Resume from here

1. Run `git status --short --branch` and `git log -8 --oneline` in the checkout. On another machine, clone the dedicated ClasslyAI repo once it is available and check out the branch with the checkpoint commits.
2. Read the [delivery plan](roadmap.md) and [architecture](architecture.md). Follow the active phase and update this checkpoint once its next action changes.
3. **Next action.** Commit and push the verified quiz slice. For public deployment, identify the application hosting project and HTTPS origin, deploy the matching API and client build, and repeat the quiz smoke test at that origin. The checkout is configured for a local app origin. Quizzes are defined in `server/classlyai/practice-quizzes.js`; publishing a new lesson revision hides its predecessor’s quiz. To verify live inference separately, configure the same live key and model settings for the API and worker, let the worker index both seeded lessons, and run `npm run eval:classlyai --prefix server -- --live` before publishing demo edits.
4. Use the roadmap for Phase 5 expansion. Keep applied migration files intact and put schema changes in a new numbered SQL file.

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
| `CLASSLYAI_OPENAI_API_KEY` | Optional live provider credential. `CLASSLYAI_AI_MODE=fixture` forces deterministic behavior. The embedding and answer model overrides are in `server/.env.example`. |
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

> Continue ClasslyAI from `docs/classlyai/handoff.md`. Read `AGENTS.md`, the roadmap, and the architecture. Inspect the working tree and start with the recorded next action. After each small, verified step, give me the exact staging, commit, and push commands to run. Update the checkpoint before handing back. Use the seeded Neon demo scope.

When updating the checkpoint, record the active phase, completed slice, checks that passed or failed, any blocker, and the next concrete command or file to work on. Link to a commit or pull request when it helps locate the work.
