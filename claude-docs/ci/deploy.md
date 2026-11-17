## Deploy

**`deploy.yml`** — CLI-driven Vercel deploy (`vercel pull` → `vercel build` →
`vercel deploy --prebuilt` → `vercel alias`). `vercel.json` sets
`deploymentEnabled: { "**": false }`, so Vercel's Git integration deploys
nothing and this workflow is the only path.

- **One upload** — `vercel deploy` passes `--archive=tgz`, so the build goes up
  as one tarball. Without it every output file is a separate upload, and
  Vercel's free plan refuses more than 5,000 a day
  (`tests/guards/vercel-deploy-archive.test.ts`).
- **Triggers** — push to `main` (`--prod`, `sorrelandsalt.com`); push to
  `staging` (Preview aliased to `staging.sorrelandsalt.com`); and a
  `pull_request` into `main` from a `hotfix/**` head (Preview aliased to a
  per-PR `hotfix-<slug>.sorrelandsalt.com`, URL posted with `pr-comment`, alias
  removed by a `teardown` job on close). The `hotfix/** → staging` PR that
  `create-pr` also opens is skipped (`branches: [main]`).
- `pull_request`, not `pull_request_target` — hotfix branches are never forks.
- **A staging deploy also builds the component workshop** into
  `public/workshop` ahead of `vercel build`; no other target does.
  [`workshop.md`](../workshop.md), "On staging", covers the step and its admin
  gate.
- The per-hotfix domains need a wildcard `*.sorrelandsalt.com` (Vercel
  nameservers, Hobby-OK). The alias slug is `hotfix/<slug>` lowercased,
  non-`[a-z0-9-]` collapsed to `-`, and **truncated to 56 characters** — the DNS
  label limit is 63 and `hotfix-` spends 7 of them. `deploy.yml` builds it in
  `resolve-target` and again in `teardown`, which recomputes it from
  `github.head_ref` because a closed PR runs no `resolve-target`. Dropping the
  alias on close keeps stale domains off the Hobby 50-domain cap.
- Bare `ubuntu-26.04` runner (needs the Vercel CLI, writes `.vercel/output`),
  with `actions/setup-node@v7` **pinned to Node 26.6.0** to match
  `Docker/Dockerfile.node` — under Node 22, `npm ci` fails because npm 10 cannot
  read the npm-11 lockfile for `typescript@7`'s per-platform deps. The Vercel
  CLI is pinned with it: `npm install --global vercel@59`, in both jobs.
- **`VERCEL_DEPLOY_TOKEN` must be minted against the `aurora-arctic` team
  scope**, not a personal scope. A personal-scope token is accepted as valid and
  then fails at `vercel pull` with `Could not retrieve Project Settings…`.
- **Every _preview_ `vercel pull` passes `--git-branch`, and no production one
  does**. Vercel resolves a branch-scoped environment variable only when the
  pull names the branch, and `staging`'s `DATABASE_URL` is such a variable — the
  override that keeps staging off the Neon integration's per-preview ephemeral
  branches (`claude-docs/design-decisions/data.md`, "Neon branch strategy: persistent staging vs. ephemeral hotfix branches"). Drop
  the flag and nothing fails: the build and the migration quietly address
  whichever database the integration last injected Preview-wide. **Pass it on
  production and everything fails** — branch-scoped overrides are Preview-only,
  and the API rejects the pair with
  ``Invalid request: `target` must be "preview" when specifying a `gitBranch` ``.

  Each workflow therefore pulls through **two steps, one per target**, selected
  by a YAML `if:` on the resolved environment — not one command with an
  optional flag. Each arm tests `== 'preview'` or `== 'production'`, never
  `!= 'production'`, so a third environment name skips both arms and fails by
  name at the assertion step rather than pulling the wrong one. `resolve-target`
  emits a `git_branch` output alongside `environment` — `github.head_ref` for a
  hotfix PR (`ref_name` there is the `refs/pull/N/merge` ref, which nothing is
  scoped to), `github.ref_name` for a push — and hands it to the deploy job's
  preview pull and to `migrate.yml`'s `git-branch` input, which stays
  **required** of every caller even though production ignores it. A new
  `vercel pull` on either side keeps both halves: the flag present on preview,
  absent on production, each arm's `if:` naming the same target its command
  does. Review holds it; no test reads CI YAML.

- **The `deploy` step passes `--meta githubDeployment=1 --meta
githubCommitRef=<branch>`.** `--git-branch` fixes what the **build** pulls;
  the running deployment resolves its own environment from its **branch
  association**, which the CLI infers from the local checkout, and
  `actions/checkout` leaves a detached HEAD that has none. Without the metadata
  the deployed app reads the Preview-wide `DATABASE_URL` (`src/db/connection.ts`
  reads it at runtime). A production deploy uses Production settings regardless,
  so `main` carries the metadata harmlessly.
- **`vercel.json`'s catch-all must stay `"**": false`.** Keys are minimatch, so
  `"*"` stops at `/` and would miss `feature/*`; and any single `true` rule wins
  the tiebreak. Re-enabling a branch means adding a key, never loosening the
  catch-all.
- The `vercel-secrets-guard` action (`id: guard`) skips every later step unless
  `VERCEL_DEPLOY_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` are set. One
  step precedes it ungated: `actions/checkout`, which a local action needs in
  order to resolve at all (full in `migrate` and `deploy`;
  `sparse-checkout: .github/actions` in `teardown`). All three are set as repo
  secrets, so the guard passes and deploys run for real. `VERCEL_SCOPE` is not
  part of the guard; only the alias step reads it. `NEON_API_KEY` and
  `NEON_PROJECT_ID` are set too, for `migrate.yml`'s production snapshot.
  `claude-docs/secrets.md` is the matrix and the source of truth for which rows
  are set.
- **`migrate.yml`** — reusable (`workflow_call`-only) workflow, applying
  `npm run db:migrate` against the environment's `DATABASE_URL`. In
  `deploy.yml` the `migrate` job sits between `resolve-target` and `deploy`. It
  is called with `secrets: inherit` and carries its own `group: migrate` /
  `cancel-in-progress: false` concurrency lock so two merges never migrate at
  once. `deploy`'s `if: success()` is load-bearing: a custom `if:` on a job with
  `needs:` replaces the implicit needs-all-succeeded check, so any other
  condition would let a failed `migrate` through. Same `vercel-secrets-guard`
  skip as `deploy.yml`. It pulls through the same two steps, one per target, and
  resolves `DATABASE_URL` as the next item describes. `environment` and
  `git-branch` come from `resolve-target`; because `git-branch` is required, a
  caller that cannot say which branch it migrates fails to start rather than
  migrating the wrong database. The two workflows must resolve `DATABASE_URL`
  identically (M1.1, "Cross-task impact").
- **`DATABASE_URL` and `BETTER_AUTH_SECRET` come from GitHub secrets, not from
  the pull**. Both are Sensitive in Vercel, so the pull writes the literal
  `[SENSITIVE]` in their place. [`secrets.md`](../secrets.md) has why no pull
  can read them, the rotation rule a second copy creates, and why named secrets
  rather than GitHub Environments. A `${{ secrets.X }}` reference to a secret
  that does not exist resolves to the empty string rather than failing, so a
  misspelt name reads as an unset value; the guard pins the names in use.

  `migrate.yml` picks `DATABASE_URL_PRODUCTION` or `DATABASE_URL_STAGING` — the
  first by the Vercel environment, the second by the branch — and falls back to
  the pulled `POSTGRES_URL` for a hotfix preview, whose Neon branch is created
  per deployment and which no static secret can name. `deploy.yml` makes the
  same choice and writes the result **into the pulled dotfile**, because
  `vercel build` reads the file and a step-level `env:` would not reach the
  Next build. The two selections must stay together: choosing differently would
  migrate one database and serve another.

- **Both jobs assert the pulled environment before using it**, via
  `scripts/assert-pulled-env.ts`. It **asserts** the keys the job needs, failing
  with a named cause (missing · empty · placeholder · not a postgres URL ·
  scheme without `user@host/database` · surviving quotes or whitespace · a
  libpq client-only parameter) rather than letting the value reach a consumer
  that cannot describe it. `deploy` requires `DATABASE_URL`,
  `BETTER_AUTH_SECRET` and `ADMIN_BOOTSTRAP_EMAIL`, the first two just written
  into the file by the override step. `migrate` requires **nothing** and runs
  report-only: its `DATABASE_URL` comes from a secret, not this file; the probe
  below validates the **resolved** URL instead. It also **reports** every key
  the pull returned, with a classification and its length, never a value, even
  when the run is about to fail; without it a lost variable surfaces only as its
  consumer's error (`ERR_INVALID_URL` with the input shown as `***`, or
  `BETTER_AUTH_SECRET is not set`), which names no surviving variable. Key names
  are not secret (`claude-docs/secrets.md`). That no value is printed is
  asserted in `tests/guards/pulled-env-assertion.test.ts`. A `vercel pull` is
  added with an assertion beside it.

  A build that issues no query still needs `DATABASE_URL` and
  `BETTER_AUTH_SECRET` real: `next build` under `NODE_ENV=production` traces
  `/api/auth/[...all]` into `src/lib/auth.ts`, which throws on an unset secret,
  and into `src/db/connection.ts`, whose module-scope `postgres()` parses its
  URL eagerly.

- **Both jobs then open the connection, before anything consumes it**, via
  `scripts/probe-database.ts`. It reads a connection string from a file,
  connects, and runs `select 1`; on success it prints the role, database and
  server version, on failure the driver's own error code and message, scrubbed
  of credentials. It exists because the deploy build issues no query and so
  prints no cause of its own, and a hint beside the cause is cheaper than
  a guess, whether the host is unreachable, the password wrong, `sslmode` mismatched or
  `channel_binding=require` against a server that cannot offer it. `ECONNREFUSED`,
  `ENOTFOUND`, `28P01`, `3D000` and `CHANNEL_BINDING_REQUIRED` each name
  themselves in its output.

  **It is fatal in `migrate` and advisory in `deploy`, deliberately.** A
  migration cannot proceed without a connection. A build parses the URL without
  issuing a query, so failing a deploy on a momentary blip would swap one outage
  for another; the warning says a deploy about to serve 500s will. A job that
  migrates or builds probes first.

  **In `migrate` it reads the resolved URL, not the pulled file**: on `staging`
  and `main` `DATABASE_URL` comes from a secret, which a check of the pulled
  file never sees. The `Resolve DATABASE_URL` step writes the winning value to
  `$RUNNER_TEMP/resolved.env` under `umask 077`, the file the probe reads. It
  reaches the script as a file path because argv is visible to `ps` and echoed
  by `set -x`, and a step-level `env:` is printed in that step's env block.

  **`channel_binding` reaches the driver, and `require` is enforced.** The
  driver reads it from the URL and treats an absent value as `prefer`. Neon
  adds `channel_binding=require` and offers it, so a Neon URL connects. A server
  that cannot offer it, such as a local Postgres without TLS, fails with
  `CHANNEL_BINDING_REQUIRED`: fix the URL or the server, not the driver.
  `withoutClientOnlyParams` in `src/db/connection-url.ts`, applied by
  `src/db/connection.ts`, `drizzle.config.ts` and the probe, strips only the
  libpq options the driver does not consume, which it would forward to the
  server as a **startup parameter** and be refused with `42704 unrecognized
configuration parameter`. A `42704` from the probe means another client-side
  option is missing from `CLIENT_ONLY_PARAMS`; add it there.

- **The reference seeds are one step inside `migrate.yml`, not a workflow of
  their own.** After the migrations, when the `seed-reference` input says so,
  it runs `npm run db:seed:categories`, `db:seed:forms`, `db:seed:astrology`,
  `db:seed:deities`, `db:seed:sources` (the sources their seed docs record,
  linked to the rows the earlier seeds wrote), `db:seed:compendium` (entries
  pick from the vocabularies and may cite a source the sources seed wrote) and
  `db:seed:demo-coven` last (`claude-docs/db/demo-scenario.md`). Deploys are
  CI-only and there is no shell on either database, so this is how any
  vocabulary reaches staging and production. One step for all seven shares a
  gate, a log and a summary, and makes the ordering against migrations
  structural (no second lock). The seeds still report apart, one `job-summary`
  call each, so a failed seed does not read as a failed migration; a failed seed
  blocks `deploy` because it fails the job `deploy` depends on. The seed summary
  also carries the compendium seed's per-entry lines on every run: a step cuts
  every `UPDATED`, `PENDING`, `REFUSED`, `ADOPTED` and `RETIRED` line (the step
  runs the compendium seed with `--adopt`, which prints `ADOPTED`), each with
  its `  differs:` line, out of `seed.log` into `job-summary`'s `details` input
  as a collapsed block headed by the count and totals line (or one line saying
  there were none), so drift reported as `PENDING` is seen without opening the
  raw log. When the compendium seed refuses an update it exits 1 with a
  `REFUSED` line per entry and the fields that differ, and three fail-only steps
  find the pull request the deploying commit came from
  (`listPullRequestsAssociatedWithCommit`), cut those lines out of `seed.log`
  and post them through `pr-comment`, which is why the workflow holds
  `pull-requests: write`. A commit no pull request carries gets the job summary
  alone.
- **Seeding an environment by hand**: `seed-environment.yml`, started only from
  the Actions tab (`workflow_dispatch`), for a site admin who needs the seed
  without a deploy. Inputs: `environment` (`preview`, which is staging, or
  `production`), `dry-run` (on by default) and `force` (off by default). It
  checks out the branch the environment deploys from (`staging` or `main`)
  whichever branch the run started from, pulls and resolves `DATABASE_URL` as
  `migrate.yml` does for the two long-lived targets, probes the database, then
  runs the same seven seeds in the same order through one command, `npm run
db:seed:reference`, in a **single transaction**: each seed reads what the
  seeds before it wrote, so run apart a dry-run deity seed would roll its new
  traditions back before the sources seed looked for them. A dry run passes
  `--dry-run` and rolls the transaction back at the end; a real run lands whole
  or not at all (`migrate.yml` runs the seven apart, each committing on its
  own). `force` passes `--force` to the compendium seed
  (claude-docs/compendium/compendium-seed/README.md, "Refusals"). Its job takes
  the `migrate` concurrency group, which is repository-wide: a run started
  during a migration waits, and a deploy waits for the run. The job summary says
  whether the run was dry or forced and lists every `UPDATED`, `REFUSED`,
  `ADOPTED`, `RETIRED` and `PENDING` line with the counts. It posts no pull
  request comment.
- **`deploy.yml`'s `seed-changed` job** diffs `github.event.before`..`github.sha`
  over the seeds' own files (`src/db/seed/categories.ts` and the
  `category-groups.ts` data it reads, `forms.ts`, `astrology.ts`, `deities.ts`,
  `sources.ts` with `src/lib/citation.ts`, the deity and astrology seed docs,
  `reference-rows.ts`, `compendium.ts` and its modules under
  `src/db/seed/compendium/`, the entry files under `compendium/`, the two
  `*-vocabulary.ts` helpers, `idempotent.ts`, `bootstrap-admin.ts`,
  `src/lib/slugify.ts`, `scripts/db-seed.ts`) and hands `migrate` the answer —
  one gate for every vocabulary, so a change to any seed runs all seven. Every
  `db:seed:<target>` script has a line in the seed step, and its file and each
  helper a place in this list. It carries **no job-level `if:`**: a skipped
  dependency skips its dependents, so gating on `github.event_name == 'push'`
  would take every hotfix preview deploy down; non-push events answer
  `changed=false` from inside the step. An unusable `before` (a new branch, or a
  force-push past what the runner fetched) seeds rather than guesses: the seed
  is additive, so a false positive costs one extra `npm run` where a false
  negative is an empty vocabulary in production.

### Neon snapshots

- **`migrate.yml` snapshots production before it migrates it**, by branching
  Neon's `main` branch as `snapshot-<short sha>` through the Neon API. That
  branch is the known-good point
  [`db/snapshot-and-restore.md`](../db/snapshot-and-restore.md)'s restore
  runbook promotes back to. A rerun of the same commit keeps the existing
  branch, which holds the database from before the first attempt migrated it.
  Preview never snapshots. The step is guarded on `NEON_API_KEY` and
  `NEON_PROJECT_ID` and warns rather than fails while they are unset
  (`claude-docs/secrets.md`). The Neon response body must be logged when a
  snapshot call fails.
- **`neon-snapshot-prune.yml` is the only scheduled workflow in the repo** —
  Sundays at 06:00 UTC, outside any deploy window, plus `workflow_dispatch`.
  Nothing calls it. **Neon's free tier caps a project at 10 branches in
  total**, and `production`, `staging`, every retained snapshot and every open
  hotfix preview's ephemeral branch draw on that quota, so the workflow keeps
  the newest `KEEP_SNAPSHOTS` (3) `snapshot-*` branches and deletes the rest. It
  carries the same inline warn-and-skip guard on those two secrets, not the
  `vercel-secrets-guard` action, which checks three others
  ([Composite actions](composite-actions.md)).

### Smoke checks

None remain. Every composite action is exercised by the checks that use it on
the same push, and `checkout-to-app` is the first step of nearly every job, so
no workflow tests the actions.

**That covers only what those checks would notice.** A check that reads a
file's _contents_ cannot tell a stale copy from a live one. What closes it is
not a job: the images carry no source layer, so a stale file has nothing to
survive _as_ (a job would make stale files _absent_, the image makes them
_impossible_; [`ci.md`, "The CI images carry no source layer"](../design-decisions/ci.md#the-ci-images-carry-no-source-layer)).
"Something else would have noticed" is not a guard.

**A workflow must never publish a status-check context `pr-gate.yml` also
publishes.** Two runs reporting one `job / job` context leave it unclear which a
branch ruleset gates on. For the same reason `build-db-image.yml` has no
`pull_request` trigger, since `pr-gate.yml` already calls it.

The gate's path filters carry each image's inputs to the checks that run
against it. `Docker/Dockerfile.node` is listed on `lint`, `typecheck` and
`build`, the three checks that run _inside_ that image, and deliberately not in
the `*shared` anchor, which also feeds `destructive_ddl`. `vitest` and
`playwright` list `Docker/Dockerfile.postgres` and `Docker/postgres-init/**`,
the two paths the database image's hash tag is computed from, so a Dependabot
PR bumping Postgres runs both suites against the new image; `playwright` lists
`Docker/Dockerfile.e2e` too.
