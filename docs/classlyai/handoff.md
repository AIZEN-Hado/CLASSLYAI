# ClasslyAI session handoff

Use this file as the current checkpoint. It contains the context a fresh session needs to start work from the checkout.

## Current checkpoint

| Item | Status |
| --- | --- |
| Product | ClasslyAI, a course workspace with an evidence-backed tutor. |
| Scope | Seeded overnight demo, with React and Express retained and Neon replacing MongoDB for the new workflow. |
| Baseline | Legacy Skill Path source at `a4f7d02`. Use `server/classlyai/index.js` for the PostgreSQL-backed ClasslyAI API. |
| Completed | PostgreSQL migrations, classroom tables, demo seed, and Express endpoints for sessions, course lists, published lessons, and instructor overviews. |
| Active phase | Phase 1. Check in authorization regression tests next, then start lesson publishing. |
| Verification so far | Real HTTP requests against local PostgreSQL 16 covered startup and shutdown, origin checks, login throttling, cookie attributes, session hashing, rotation, expiry, logout, cross-course access, instructor access, and draft, withdrawal, and revocation handling. The earlier migration and seed checks passed. The legacy frontend builds and its baseline lint reported 96 errors and 36 warnings. |
| Environment | The database tooling was tested locally. Live Neon and model provider credentials are still unverified. PostgreSQL is the only Neon service needed for this scope. |
| Data | Use seeded courses. Existing MongoDB data and production cutover are outside the demo boundary. |
| Git checkpoints | The user runs the staging, commit, and push commands supplied by the assistant after each completed step. |
| GitHub repository | The dedicated ClasslyAI repo has yet to be created. The existing `origin` is the legacy Learning Management System repo. |

## Resume from here

1. Run `git status --short --branch` and `git log -8 --oneline` in the checkout. On another machine, clone the dedicated ClasslyAI repo once it is available and check out the branch with the checkpoint commits.
2. Read the [delivery plan](roadmap.md) and [architecture](architecture.md). Follow the active phase and update this checkpoint once its next action changes.
3. **Next action.** Add checked-in `node:test` coverage for the ClasslyAI API. Build on `createApp({ pool, origin })` in `server/classlyai/app.js`. Cover student-to-student course isolation, instructor-only access, draft and withdrawal filtering, revoked memberships, logout, and disallowed origins. Run real database tests against an isolated fixture database. Then continue to Phase 2 in the roadmap.
4. **Neon verification.** Set up `server/.env` using `server/.env.example`. Run `npm run db:migrate --prefix server` and `npm run db:check --prefix server`. Keep existing migration files intact and put schema changes in a new numbered SQL file.

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
| AI provider credential and model IDs | Choose one provider when implementing live indexing. Document its exact variable names in `server/.env.example` at that point. Use a deterministic fixture adapter for tests. |

Keep values in the ignored `server/.env` or the deployment secret store. A fresh machine needs its own copy from the secret store. Verify the configured Git author before the first commit on another machine if the intended GitHub attribution changes.

## Seed the demo classroom

After migrating an isolated development database, add three distinct passwords to `server/.env`. The seed uses `DATABASE_URL` and needs write access to the `classlyai` schema.

| Demo account | Password variable | Course access |
| --- | --- | --- |
| `instructor@classlyai.example` | `CLASSLYAI_DEMO_INSTRUCTOR_PASSWORD` | Instructor in both courses |
| `student-a@classlyai.example` | `CLASSLYAI_DEMO_STUDENT_A_PASSWORD` | Reliable Backend Systems |
| `student-b@classlyai.example` | `CLASSLYAI_DEMO_STUDENT_B_PASSWORD` | Evaluating Search Systems |

Use passwords of at least 12 characters and at most 72 UTF-8 bytes. From the repository root, run `node --env-file-if-exists=server/.env server/db/seed.js`. Re-running the seed preserves existing demo credentials, revoked memberships, and withdrawn revisions.

## Start the ClasslyAI API

From the repository root, run `node --env-file-if-exists=server/.env server/classlyai/index.js`. The API checks the classroom schema before listening. `GET /api/health` reports availability. `POST /api/auth/login` accepts JSON `email` and `password` and sets a session cookie. `GET /api/auth/me` returns the signed-in user, and `POST /api/auth/logout` revokes the current session. For manual POST requests, send the `Origin` header matching `CLASSLYAI_ORIGIN`.

Use `GET /api/courses` to list the signed-in user’s courses, `GET /api/courses/:courseSlug` for published lesson links, and `GET /api/courses/:courseSlug/lessons/:lessonSlug` for lesson content. `GET /api/courses/:courseSlug/instructor` returns revision pointers for that course’s instructors.

## Resume prompt

> Continue ClasslyAI from `docs/classlyai/handoff.md`. Read `AGENTS.md`, the roadmap, and the architecture. Inspect the working tree and start with the recorded next action. After each small, verified step, give me the exact staging, commit, and push commands to run. Update the checkpoint before handing back. Use the seeded Neon demo scope.

When updating the checkpoint, record the active phase, completed slice, checks that passed or failed, any blocker, and the next concrete command or file to work on. Link to a commit or pull request when it helps locate the work.
