# The CI Vitest job: DOM only where needed, GitHub's runner

**Status:** decided. Live home: `claude-docs/ci/runner-budget.md`, "Splitting the Vitest job" and "Why Blacksmith was dropped".

## Decision

- **The suite is not slow; where and how it runs is.** The `vitest` job took 2m47s on CI while the same run with coverage takes 14s in the devcontainer (12 cores, 11 workers). The fix is in the suite's setup and the runner, not the tests.
- **jsdom, jest-dom and React Testing Library boot only for files that need a DOM.** Of the 71 `unit` files at the time, nine needed one (the `.tsx` component and provider tests), plus two `.ts` files that need jsdom's `location`: `tests/lib/auth-client.test.ts` (Better Auth's client reads `window.location.origin` and `document.cookie`) and `tests/support/msw/graphql.test.ts` (relative `fetch('/api/graphql')`). A pure-node file that needs MSW (`tests/lib/mail.test.ts`) takes it explicitly.
- **No blanket `--no-isolate`.** It halves the unit project locally but breaks `tests/app/providers.test.tsx` (`vi.stubGlobal('window', undefined)` leaks through a shared module graph), and about 15 unit files use `vi.mock`, `vi.stubGlobal` or `vi.stubEnv`.
- **`tests/support/db-project.mts` pins `maxWorkers` for `db` only.** `unit` and `rsc` leave it unset and share the pool fine, so a new project leaves it unset too.
- **Job-level `cancel-in-progress: false` does not survive a workflow-level `true`.** The build jobs' protection never existed and is not needed: the image push is manifest-last and the cache export is per-blob, so a cancelled build leaves no tag and no index. `deploy.yml` (`false`, alias safety) and `migrate` (a lock) are right as they are.
- **Blacksmith was weighed for the `vitest` job and later dropped on cost** (3,000 free two-vCPU minutes per organisation per month, an 8-vCPU runner drawing 4× per minute). Moving Playwright or the image builds there was rejected, as it would have drawn about twice the free tier alone. GitHub's minutes on a public repo are free.

## Why

jsdom and its setup cost a boot per file for 59 files that never touch a DOM. The Actions cache sat at its 10 GB cap because the same blob digests were stored once per PR merge ref (a cache created for a merge ref can only be restored by re-runs of that pull request), crowding out the Next.js and npm caches; `build-db-image.yml` skips if the tag exists, so a post-merge build would write nothing anyway.

## Rules out

- A blanket `--no-isolate`.
- Relying on job-level `cancel-in-progress: false` under a workflow-level `true`.
- A runner billed against a per-organisation free tier shared with other repos.
