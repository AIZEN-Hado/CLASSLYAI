# Working on ClasslyAI

- Start at [the session handoff](docs/classlyai/handoff.md). Use [the delivery plan](docs/classlyai/roadmap.md) for phase scope and [the architecture](docs/classlyai/architecture.md) for implementation decisions.
- Check the current branch, working tree, and recent commits. Preserve any work already in progress and continue from the first unfinished slice.
- Use the dedicated `classlyai` remote for ClasslyAI push commands. If it has yet to be configured, use the [repository setup steps](docs/classlyai/handoff.md#connect-the-github-repository) and provide local commit commands in the meantime.
- Keep the seeded demo isolated from production databases and credentials. Store real secrets in ignored environment files or the deployment secret store.
- Work in small, self-contained steps. After each completed step, report the checks and give the user exact `git add`, `git commit`, and `git push` commands. The user runs those commands. Keep the checkpoint current when the next action, environment setup, or verification status changes.
