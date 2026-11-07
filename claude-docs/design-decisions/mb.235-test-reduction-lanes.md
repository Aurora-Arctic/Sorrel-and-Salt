# MB.235 to MB.238 — the approved plan

**Status:** decided and built. Only the decisions, the reasons and what they rule out are kept here.

## Recommended work, in order of seconds off the gate per hour spent

Each is its own task and PR (one task per PR; minted MB.235 up in execution order after MB.234, synced to the board). Opus agents implement; I orchestrate, measure on each PR's gate run, and record the before/after in the task entry and `claude-docs/ci/runner-budget.md`.

## Not recommended, and why

- **Builds or Playwright on Blacksmith.** Above. Revisit only if the free tier is raised or Playwright grows past ~5 minutes.
- **Merging the seven small `checks` legs into one runner.** Saves ~150 s of free GitHub minutes per run and changes every check name; no gate-time gain because they run beside Playwright.
- **Sharding Playwright across runners.** 56 tests do not need it; the pull and build are fixed costs each shard would repeat.
