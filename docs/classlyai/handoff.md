# ClasslyAI session handoff

Use this file as the current checkpoint. It contains the context a fresh session needs to start work from the checkout.

## Current checkpoint

| Item | Status |
| --- | --- |
| Product | ClasslyAI, a course workspace with an evidence-backed tutor. |
| Scope | Seeded overnight demo, with React and Express retained and Neon replacing MongoDB for the new workflow. |
| Baseline | Legacy Skill Path source at `a4f7d02`. The current app entry points still use Mongoose. |
| Completed | Source audit, architecture, phased plan, and session handoff. |
| Active phase | Phase 0. ClasslyAI implementation has yet to begin. |
| Verification so far | A prior audit checked the syntax of all 61 tracked server JavaScript files. Its offline client install stopped on an uncached `yaeti` dependency, so client lint and build are unverified. |
| Environment | Neon project and model provider configuration are unverified. PostgreSQL is the only Neon service needed for this scope. |
| Data | Use seeded courses. Existing MongoDB data and production cutover are outside the demo boundary. |

## Resume from here

1. Run `git status --short --branch` and `git log -8 --oneline` in the checkout. If you are on a different machine, check out the branch containing the latest checkpoint commits with an account that can access the repo.
2. Read the [delivery plan](roadmap.md) and [architecture](architecture.md). Follow the active phase and update this checkpoint once its next action changes.
3. **Next action.** Run `npm ci --prefix client` and `npm ci --prefix server`, then run `npm run lint --prefix client` and `npm run build --prefix client`. Record the results or exact blocker. Check the baseline server with `git ls-files -z 'server/*.js' | xargs -0 -n 1 node --check`.
4. **First implementation slice.** Add a typed or validated PostgreSQL environment contract, `pg` connection, and SQL migration command in `server/`. Write a placeholder-only `server/.env.example`. Verify a connection and migration against a Neon development branch when credentials are available. Keep this slice independent of the model provider.

## Local configuration

These are planned configuration names for the new implementation. The legacy server uses `MONGO_URI`.

| Variable | Where to get it |
| --- | --- |
| `DATABASE_URL` | Pooled connection string for the Neon development branch from **Connect**. |
| `DATABASE_URL_DIRECT` | Direct connection string for that branch, with connection pooling turned off in **Connect**. Use it for migrations. |
| AI provider credential and model IDs | Choose one provider when implementing live indexing. Document its exact variable names in `server/.env.example` at that point. Use a deterministic fixture adapter for tests. |

Keep values in the ignored `server/.env` or the deployment secret store. A fresh machine needs its own copy from the secret store. Verify the configured Git author before the first commit on another machine if the intended GitHub attribution changes.

## Resume prompt

> Continue ClasslyAI from `docs/classlyai/handoff.md`. Read `AGENTS.md`, the roadmap, and the architecture. Inspect the working tree, start with the recorded next action, and make small commits for verified changes. Update the checkpoint before handing back. Use the seeded Neon demo scope.

When updating the checkpoint, record the active phase, completed slice, checks that passed or failed, any blocker, and the next concrete command or file to work on. Link to a commit or pull request when it helps locate the work.
