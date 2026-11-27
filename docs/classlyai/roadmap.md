# ClasslyAI delivery plan

**Tonight’s target** is a runnable portfolio demo with seeded courses, separate instructor and student access, a lesson editor, a cited tutor, and a reproducible retrieval comparison. Existing MongoDB data stays outside the demo. Moving real records requires an explicit migration decision and a separate release.

See the [architecture](architecture.md) for data flow and invariants. See the [handoff](handoff.md) for current status and the next action.

## Phase 0 · Establish the baseline

- Run the current client build and lint, check server syntax, and record environment or dependency blockers as they occur. Capture which legacy routes and components the demo will replace.
- Document the demo environment with placeholders only. Use a Neon development branch, Node.js 24, and an ignored `server/.env`. Separate the pooled application connection from the direct migration connection. Keep production credentials out of the demo.
- **Exit check.** The starting revision, baseline outcomes, and exact first implementation action are in the handoff.
- **Suggested commit message.** `chore: document ClasslyAI development prerequisites`

## Phase 1 · Build the Postgres foundation

- Add the `pg` connection and a migration command. Define user, session, course, membership, lesson, and revision tables with constraints. Add the vector extension through a migration when the search schema needs it.
- Start the ClasslyAI API with an idempotent seeded dataset. Add server-side session auth, explicit course roles, and a reusable authorization policy. Connect the student and instructor routes to the new API. Keep the demo entry point scoped to supported features.
- **Exit check.** A fresh database migrates and seeds correctly. Rerunning the seed creates no duplicates. Two students with different memberships see different courses, and each denied API call stays denied at the backend.
- **Suggested commit messages.**
  - `feat(db): add Neon connection and SQL migration runner`
  - `feat(db): add classroom schema and demo seed`
  - `feat(auth): add revocable sessions and course authorization`
  - `test(auth): cover course membership and staff permissions`

## Phase 2 · Publish and index a lesson

- Implement draft saving, publish requests, and status reads. Add deterministic Markdown passage splitting with stable source offsets. Process indexing with job leases, retry limits, and transactional activation of a ready revision.
- Build the instructor editor around save, publish, indexing, ready, and retry states. Give the instructor a student preview of the currently active revision.
- **Exit check.** Publishing the same revision twice creates one job. A worker restart can recover an expired job. The last good revision remains available during a failed rebuild, and a slow older job cannot activate over a newer revision.
- **Suggested commit messages.**
  - `feat(lessons): add draft and publish endpoints`
  - `feat(indexing): add durable jobs and Markdown passage splitting`
  - `feat(indexing): batch embeddings and activate ready revisions`
  - `feat(ui): build lesson editor and indexing states`

## Phase 3 · Ship the evidence-backed tutor

- Implement course-scoped keyword and vector retrieval, then merge rankings for hybrid search. Add the structured answer contract, source validation, and insufficient-evidence result. Handle provider deadlines and per-user usage limits.
- Build the student lesson reader and tutor panel. Clicking a citation highlights its exact source passage. On mobile, show the source in a sheet and restore focus to the citation when it closes.
- **Exit check.** An enrolled student can ask a paraphrased question and open its evidence. Unsupported questions abstain. Another course’s content, draft revisions, and content after access revocation stay out of responses and citation lookups.
- **Suggested commit messages.**
  - `feat(search): add course-scoped keyword and vector retrieval`
  - `feat(search): add hybrid ranking and retrieval trace`
  - `feat(tutor): validate cited answers and handle insufficient evidence`
  - `feat(ui): build lesson reader with clickable citations`

## Phase 4 · Prove it and package the demo

- Add a labeled fixture corpus and one command that compares retrieval strategies. Capture measured Recall@5, latency, and representative misses, then run a separate live provider smoke test. Include result metadata so another developer can rerun the same comparison.
- Add regression coverage for the highest-risk paths, CI commands, setup and seed steps, and a short demo walkthrough. Check desktop and mobile, keyboard focus, loading and empty states, and provider errors. Remove demo routes or dependencies that the new flow supersedes after verifying their callers.
- **Exit check.** A fresh checkout can follow the README to migrate, seed, start the app and worker, run tests, and reproduce the fixture report. The live demo shows a cited answer, a publish update, abstention, and access denial. Keep unfinished work visible in the handoff.
- **Suggested commit messages.**
  - `test(eval): add labeled corpus and retrieval comparison runner`
  - `test(tutor): cover citation validation and access revocation`
  - `chore(ci): run build, tests, and fixture evaluation`
  - `docs: record measured demo results and walkthrough`

## Phase 5 · Expand after the demo

- If real data exists, inventory and map MongoDB IDs, memberships, lesson URLs, progress, quiz attempts, and purchases. Rehearse an import on a separate database, reconcile counts and key relationships, and plan cutover and rollback.
- Bring back progress and quizzes in complete workflows. Add private object storage for PDF and video assets only when those workflows are ready. Restore commerce only if required, with idempotent fulfillment and private invoices.
- Before using production data, verify least-privilege access, restore procedures, rate limits, and request logging. Address the legacy Telegram session exposure and public invoice access separately if the old app is live.

## Overnight trade-offs

Build in phase order. For a six- to eight-hour build, aim to clear setup and database/auth in the first two hours, reach an end-to-end answer by hour five, and reserve the last 60–90 minutes for checks and a demo rehearsal. These are planning estimates. If time runs short, keep keyword retrieval, validated citations, course isolation, and an honest fixture report. Add hybrid search and revision activation only as complete, tested slices. A live provider result and a fixture-only result have distinct labels in the demo and README.

## Commit workflow

Work in small changes that can be reviewed and verified on their own. After each completed step, the assistant reports the checks and provides ready-to-run `git add` with explicit paths, `git commit` with the message for that step, and `git push` for the current branch. The user runs the commands. Update the handoff with the step when the next session would need to start somewhere different.

For GitHub attribution, use an author email tied to the intended GitHub account, including its GitHub-provided `noreply` address if preferred. Changing your ChatGPT account has no effect on Git authorship. Local commits must reach the standalone repo’s default branch to qualify in this workflow. If you use a pull request, preserve individual commits with a merge method that retains them. [GitHub contribution criteria](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference#contribution-criteria-for-commits)
