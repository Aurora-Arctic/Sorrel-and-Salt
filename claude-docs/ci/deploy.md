## Deploy

**`deploy.yml`** — CLI-driven Vercel deploy (`vercel pull` → `vercel build` →
`vercel deploy --prebuilt` → `vercel alias`). `vercel.json` sets
`deploymentEnabled: { "**": false }`, so Vercel's Git integration deploys
nothing and this workflow is the only path.

- **Triggers** — push to `main` (`--prod`, `sorrelandsalt.com`); push to
  `staging` (Preview aliased to `staging.sorrelandsalt.com`); and a
  `pull_request` into `main` from a `hotfix/**` head (Preview aliased to a
  per-PR `hotfix-<slug>.sorrelandsalt.com`, URL posted with `pr-comment`, alias
  removed by a `teardown` job on close). The `hotfix/** → staging` PR that
  `create-pr` also opens is skipped (`branches: [main]`).
- `pull_request`, not `pull_request_target` — hotfix branches are never forks.
- **A staging deploy also builds the component workshop** into
  `public/workshop` ahead of `vercel build` (M2.10); no other target does.
  [`workshop.md`](../workshop.md), "On staging", covers the step and its admin
  gate.
- The per-hotfix domains need a wildcard `*.sorrelandsalt.com` (Vercel
  nameservers, Hobby-OK).
  The alias slug is `hotfix/<slug>` lowercased, non-`[a-z0-9-]` collapsed to
  `-`, and **truncated to 56 characters** — the DNS label limit is 63 and
  `hotfix-` spends 7 of them. `deploy.yml` builds it twice: in
  `resolve-target`, and again in `teardown`, which recomputes it from
  `github.head_ref` because a closed PR runs no `resolve-target` to read it
  from. Dropping the alias on close is what keeps stale per-hotfix domains
  off the Hobby 50-domain cap.
- Bare `ubuntu-26.04` runner (needs the Vercel CLI, writes `.vercel/output`),
  with `actions/setup-node@v7` **pinned to Node 26.6.0** to match
  `Docker/Dockerfile.node` — under Node 22, `npm ci` fails because npm 10 cannot
  read the npm-11 lockfile for `typescript@7`'s per-platform deps. The Vercel
  CLI is pinned with it: `npm install --global vercel@59`, in both jobs.
- **`VERCEL_DEPLOY_TOKEN` must be minted against the `aurora-arctic` team
  scope**, not a personal scope. A personal-scope token is accepted as valid and
  then fails at `vercel pull` with `Could not retrieve Project Settings…`.
- **Every _preview_ `vercel pull` passes `--git-branch`, and no production one
  does** (MB.27, MB.45). Vercel resolves a branch-scoped
  environment variable only when the pull names the branch, and `staging`'s
  `DATABASE_URL` is precisely such a variable — the override that keeps staging
  off the Neon integration's per-preview ephemeral branches
  (`claude-docs/design-decisions/m1.1-neon-branch-strategy.md`). Drop the flag
  and nothing fails: the pull succeeds, the deploy succeeds, and both the build
  and the migration quietly address whichever database the integration last
  injected Preview-wide. **Pass it on production and everything fails** —
  branch-scoped overrides are a Preview-only feature, and the API rejects the
  pair outright with
  ``Invalid request: `target` must be "preview" when specifying a `gitBranch` ``.
  Production has no branch-resolved value to miss, so it loses nothing by
  omitting it.

  Each workflow therefore pulls through **two steps, one per target**, selected
  by a YAML `if:` on the resolved environment — not one command with an
  optional flag. A command that merely _might_ carry `--git-branch` cannot
  satisfy the preview half, and a `if:` is data the guard can read where a
  shell `if` would be a string it had to parse. Each arm tests `== 'preview'`
  or `== 'production'` rather than `!= 'production'`, so a third environment
  name skips both arms and fails by name at the assertion step rather than
  pulling the wrong one. `resolve-target` emits a
  `git_branch` output alongside `environment` — `github.head_ref` for a hotfix
  PR (`ref_name` there is the `refs/pull/N/merge` ref, which nothing is scoped
  to), `github.ref_name` for a push — and hands it to both the deploy job's
  preview pull and `migrate.yml`'s `git-branch` input, which stays **required**
  of every caller even though production ignores it: a caller that cannot name
  its branch cannot be trusted with preview either.
  `tests/guards/vercel-pull-git-branch.test.ts` is the guard. It sweeps every
  workflow and checks both halves — the flag present on preview, absent on
  production, and each arm's `if:` naming the same target its command does —
  so the next `vercel pull` added on either side fails in the diff that adds
  it.

- **The `deploy` step passes `--meta githubDeployment=1 --meta
githubCommitRef=<branch>`** — the deploy-side half of the same fix, and
  equally load-bearing. `--git-branch` fixes what the **build** pulls; the
  running deployment resolves its own environment from its **branch
  association**, which the CLI infers from the local checkout — and
  `actions/checkout` leaves a detached HEAD, which has none. So without the
  metadata the deployed app reads the Preview-wide `DATABASE_URL` no matter how
  the build was pulled, and `src/db/connection.ts` reads that variable at
  runtime. Vercel's own docs pair the two commands for exactly this
  prebuilt-in-CI case. A production deploy uses Production settings regardless
  of the metadata, so `main` carries it harmlessly rather than branching the
  command.
- **`vercel.json`'s catch-all must stay `"**": false`.** Keys are minimatch, so
  `"*"` stops at `/` and would miss `feature/*`; and any single `true` rule wins
  the tiebreak. Re-enabling a branch means adding a key, never loosening the
  catch-all.
- The `vercel-secrets-guard` action (`id: guard`) skips every later step unless
  `VERCEL_DEPLOY_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` are set. One
  step precedes it ungated: `actions/checkout`, which a local action needs in
  order to resolve at all, so a run with the secrets absent still pays for a
  checkout — full in `migrate` and `deploy`, where it was already the next
  step, and `sparse-checkout: .github/actions` in `teardown`, which had no
  checkout before and reads nothing else from the repo. All three are set as repo
  secrets, so **the guard passes and deploys run for real** — as of v0.2.0 both
  `staging` and `main` reach `vercel pull`. `VERCEL_SCOPE` is **not** part of
  the guard and never was. It is set, and only the alias step reads it.
  `NEON_API_KEY`/`NEON_PROJECT_ID` are set too, for `migrate.yml`'s
  production snapshot.
  `claude-docs/secrets.md` is the matrix and the source of truth for which rows
  are set.
- **`migrate.yml` (M1.4)** — reusable (`workflow_call`-only) workflow, applying
  `npm run db:migrate` against the environment's `DATABASE_URL`. In
  `deploy.yml` the `migrate` job sits between `resolve-target`, whose output
  both later jobs need, and `deploy`. It calls this workflow with
  `secrets: inherit` and carries its own `group: migrate` /
  `cancel-in-progress: false` concurrency lock so two merges never migrate at
  once. `deploy`'s `if: success()` is load-bearing: a custom `if:`
  on a job with `needs:` replaces the implicit needs-all-succeeded check, so
  any other condition there would let a failed `migrate` through to the
  deploy. Same `vercel-secrets-guard` skip as `deploy.yml` when the `VERCEL_*`
  secrets are absent. It pulls through the same two steps, one per target, and
  resolves `DATABASE_URL` as the next item describes — a named secret on
  `staging` and `main`, the integration's per-deployment ephemeral Neon branch
  for a hotfix preview (see
  `claude-docs/design-decisions/m1.1-neon-branch-strategy.md`) — masked before
  use. `environment` and `git-branch` both come from `resolve-target`, and
  `git-branch` is the **required** input above, so a caller that cannot say
  which branch it is migrating fails to start rather than migrating the wrong
  database. M1.1's "Cross-task impact" requires the two workflows to resolve
  `DATABASE_URL` identically, and that is the requirement in mechanical form.
- **`DATABASE_URL` and `BETTER_AUTH_SECRET` come from GitHub secrets, not from
  the pull** (MB.47). Both are Sensitive in Vercel, so the pull writes the
  literal `[SENSITIVE]` in their place, and CI keeps its own copy of each as a
  repository secret named per target. [`secrets.md`](../secrets.md) has why no
  pull can read them, the rotation rule a second copy creates, and why named
  secrets rather than GitHub Environments. A `${{ secrets.X }}` reference to a secret
  that does not exist resolves to the empty string rather than failing, so a
  misspelt name reads as an unset value; the guard pins the names in use.

  `migrate.yml` picks `DATABASE_URL_PRODUCTION` or `DATABASE_URL_STAGING` — the
  first by the Vercel environment, the second by the branch — and falls back to
  the pulled `POSTGRES_URL` for a hotfix preview, whose Neon branch is created
  per deployment and which no static secret can name. `deploy.yml` makes the
  same choice and writes the result **into the pulled dotfile**, because
  `vercel build` reads the file and a step-level `env:` would not reach the
  Next build. `tests/guards/ci-secret-environments.test.ts` holds the two
  selections together: choosing differently would migrate one database and
  serve another.

- **Both jobs assert the pulled environment before using it** (MB.46), via
  `scripts/assert-pulled-env.ts`. It does two things. It **asserts** the keys
  that job needs, failing with a named cause (missing · empty · placeholder ·
  not a postgres URL · scheme without `user@host/database` · surviving quotes
  or whitespace · a libpq client-only parameter, MB.49) rather than letting the
  value reach a consumer that cannot describe it. `deploy` requires
  `DATABASE_URL`, `BETTER_AUTH_SECRET` and `ADMIN_BOOTSTRAP_EMAIL`, the first
  two just written into the file by the override step above. `migrate` requires
  **nothing** and runs report-only: on either long-lived target its
  `DATABASE_URL` comes from a secret, not this file, so requiring it here would
  fail on a value nothing reads. What that job validates instead is the
  **resolved** URL, one step later — see the probe below.

  And it **reports** every key the pull
  returned, with a classification and its length, never a value; that report
  prints even when the run is about to fail.

  The report is the half worth having: without it, a variable the pull lost
  surfaces only as whatever its consumer throws — `ERR_INVALID_URL` with the
  input shown as `***`, or `BETTER_AUTH_SECRET is not set` — and neither names
  which variables survived. MB.46 tells the outage that showed it. Key names are not secret —
  `claude-docs/secrets.md` enumerates them — and that no value is ever printed
  is asserted in `tests/guards/pulled-env-assertion.test.ts` rather than
  intended. The same file sweeps the workflow directory, so a `vercel pull`
  added without an assertion beside it fails in the diff that adds it.

  A build that issues no query still needs `DATABASE_URL` and
  `BETTER_AUTH_SECRET` real: `next build`
  under `NODE_ENV=production` traces `/api/auth/[...all]` into
  `src/lib/auth.ts`, which throws on an unset secret, and into
  `src/db/connection.ts`, whose module-scope `postgres()` parses its URL
  eagerly. A placeholder is not harmless to it.

- **Both jobs then open the connection, before anything consumes it** (MB.49),
  via `scripts/probe-database.ts`. It reads a connection string from a file,
  connects, and runs `select 1`; on success it prints the role, database and
  server version that answered, and on failure the driver's own error code and
  message — scrubbed of the credentials, never the URL.

  It exists because `drizzle-kit migrate` catches whatever postgres.js throws
  and exits 1 without printing it: its log stops at `applying migrations...`
  whether the host is unreachable, the password wrong, `sslmode` mismatched or
  a `channel_binding` parameter present — four fixes behind one identical
  failure (MB.49 has the log and the deploys it cost). In the probe's output
  `ECONNREFUSED`, `ENOTFOUND`, `28P01`, `3D000` and `42704` each name
  themselves, and the codes worth a sentence carry one.

  **It is fatal in `migrate` and advisory in `deploy`, deliberately.** A
  migration cannot proceed without a connection, so a probe that warned there
  would leave the job as silent as it was. A build genuinely does not need the
  database — it parses the URL without issuing a query — so failing a deploy
  on a momentary blip would swap one outage for another; what the warning buys is
  that a deploy about to serve 500s says so at build time.
  `tests/guards/database-probe.test.ts` asserts the two apart, and sweeps the
  workflow directory so a job that migrates or builds without probing first
  fails in the diff that adds it.

  **In `migrate` it reads the resolved URL, not the pulled file**, and that is
  the point rather than a detail: on `staging` and `main` `DATABASE_URL` comes
  from a secret, which a check of the pulled file never sees, so a malformed secret
  would fail as silently as drizzle-kit does (MB.49 tells how that gap
  reopened). The `Resolve DATABASE_URL` step writes the winning value, secret
  or pulled `POSTGRES_URL` alike, to `$RUNNER_TEMP/resolved.env` under
  `umask 077`, which is the file the probe reads. It reaches the script as a
  file path, as the pulled file reaches `assert-pulled-env.ts`: argv is visible
  to `ps` and echoed by `set -x`, and a step-level `env:` is printed in that
  step's own env block.

  **`channel_binding` has its own rule**, in the validator rather than the
  probe, so it fails before a connection is even attempted. postgres.js
  consumes `sslmode` and the keys in its own `defaults`, then forwards every
  remaining query parameter to the server as a **startup parameter** — so a
  libpq _client-side_ option reaches a server that has never heard of it and
  gets `42704 unrecognized configuration parameter "channel_binding"`. Neon's
  console puts it in the connection strings it hands you by default, which is
  why it is worth a named rule rather than a note; `sslmode=require` on its own
  is fine and is what actually requests TLS.

- **The reference seeds (M4.3, M4.3a, MB.93, MB.129) are one step inside
  `migrate.yml`, not a workflow of their own.** After the migrations, `npm run
db:seed:categories`, `npm run db:seed:forms`, `npm run db:seed:astrology`
  and `npm run db:seed:deities` write DESIGN.md §6's category vocabulary, §5's
  ingredient form, planet and zodiac vocabularies and the deity vocabulary
  into the schema they just created, when the `seed-reference` input says
  so. One step for all four, sharing a gate, a log
  and a summary: a form vocabulary seeded while the categories failed is not a
  state worth reporting separately. It is how any vocabulary reaches staging
  and production at all: deploys are CI-only and there is no shell on either
  database, so reference data has to arrive with the deploy that needs it.
  A separate reusable workflow was written first and then folded in — it
  needed exactly what the migration needs and nothing else (a checkout,
  `npm ci`, the Vercel CLI, the same pulled `DATABASE_URL`), so it paid for
  all of that a second time to run one `npm run`, and needed its own
  concurrency lock against `migrate` to avoid seeding a schema mid-migration.
  Sharing the job makes that ordering structural. The two still report
  separately — one `job-summary` call each — so a failed seed does not read as
  a failed migration, and a failed seed blocks `deploy` for free, because it
  fails the job `deploy` already depends on.
- **`deploy.yml`'s `seed-changed` job** diffs
  `github.event.before`..`github.sha` over the seeds' own files
  (`src/db/seed/categories.ts` and the `category-groups.ts` data it reads, `src/db/seed/forms.ts`,
  `src/db/seed/astrology.ts`, `src/db/seed/deities.ts`, the two
  `*-vocabulary.ts` helpers they write through, `src/db/seed/bootstrap-admin.ts`,
  `src/lib/slugify.ts`, `scripts/db-seed.ts`) and hands `migrate` the answer
  — one gate for every vocabulary, so a change to any seed runs all four.
  `tests/guards/reference-seed-wiring.test.ts` holds every `db:seed:<target>`
  script to a line in the seed step and its file to this list, and each
  helper to the list too: `two-tier-vocabulary.ts` was missing from it until
  MB.129.
  Two things about it are load-bearing. It carries **no job-level `if:`**: a
  skipped dependency skips its dependents, so gating the job on
  `github.event_name == 'push'` would take every hotfix preview deploy down
  with it — non-push events answer `changed=false` from inside the step
  instead. And an unusable `before` (a new branch, or a force-push past what
  the runner fetched) seeds rather than guesses: the seed is additive, so a
  false positive costs one extra `npm run` where a false negative is an empty
  vocabulary in production.
