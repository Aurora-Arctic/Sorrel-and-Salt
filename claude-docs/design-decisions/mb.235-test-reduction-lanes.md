# Gate-time reductions not taken

**Status:** decided. Live home: `claude-docs/ci/runner-budget.md`.

## Decision

- **Reductions are ordered by seconds off the gate per hour spent**, each its own task and PR, with the before and after recorded from the PR's gate run in the task entry and `claude-docs/ci/runner-budget.md`.
- **Not taken:**
  - **Builds or Playwright on Blacksmith** (`claude-docs/ci/runner-budget.md`, "Why Blacksmith was dropped"). Revisit only if the free tier is raised or Playwright grows past about 5 minutes.
  - **Merging the seven small `checks` legs into one runner:** saves about 150 s of free GitHub minutes per run and changes every check name, with no gate-time gain because they run beside Playwright.
  - **Sharding Playwright across runners:** 56 tests do not need it, and the pull and build are fixed costs each shard would repeat.

## Why

Each rejected option costs more than it saves in gate time.

## Rules out

- Renaming checks for minutes that are free.
