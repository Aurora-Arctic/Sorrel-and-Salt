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
  does** (MB.27, narrowed by MB.45). Vercel resolves a branch-scoped
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
  MB.27 passed it unconditionally and broke every production
  deploy until MB.45; production has no branch-resolved value to miss, so it
  loses nothing by omitting it.

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
  `npm run db:migrate` against the environment's `DATABASE_URL`. `deploy.yml`
  splits its old single `deploy` job into three: `resolve-target` (the old
  "Resolve deploy target" step, now standalone since both later jobs need its
  output), `migrate` (`needs: resolve-target`, calls this workflow with
  `secrets: inherit`, and carries its own `group: migrate` /
  `cancel-in-progress: false` concurrency lock so two merges never migrate at
  once), and `deploy`, whose `if: success()` is load-bearing: a custom `if:`
  on a job with `needs:` replaces the implicit needs-all-succeeded check, so
  any other condition there would let a failed `migrate` through to the
  deploy. Same `vercel-secrets-guard` skip as `deploy.yml` when the `VERCEL_*`
  secrets are absent. `vercel pull --environment=preview --git-branch=<branch>`, or
  `vercel pull --environment=production` with no branch (MB.45), resolves the
  right `DATABASE_URL` for each target the same way `deploy.yml`'s own two
  pulls do — the branch-scoped override for
  `staging`, the integration's per-deployment ephemeral Neon branch for a
  hotfix preview (see
  `claude-docs/design-decisions/m1.1-neon-branch-strategy.md`) — read from
  `.vercel/.env.<environment>.local` and masked before use. Both halves of that
  come from `resolve-target`: `git-branch` is a **required** `workflow_call`
  input, so a caller that cannot say which branch it is migrating fails to
  start rather than migrating the wrong database. M1.1's "Cross-task impact"
  requires the two workflows to resolve `DATABASE_URL` identically, and that is
  the requirement in mechanical form.
- **`DATABASE_URL` and `BETTER_AUTH_SECRET` come from GitHub secrets, not from
  the pull** (MB.47). Both are marked Sensitive in Vercel, and a Sensitive
  variable cannot be read back by `vercel pull` — the pull writes the literal
  string `[SENSITIVE]` instead, which is non-empty and so passes any check that
  only asks whether something is set. A diagnostic run pulled staging both with
  and without `--git-branch` and got the placeholder either way, so no
  arrangement of flags fixes it. A `${{ secrets.X }}` reference to a secret
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

  Named secrets rather than GitHub Environments, deliberately — an environment
  would need a new `workflow_call` input, a new `resolve-target` output and an
  `environment:` key on two jobs, to say what the secret's name already says.
  `claude-docs/secrets.md` carries the rotation rule this creates, and the
  Neon-API route that could retire it, and why it has not.

- **Both jobs assert the pulled environment before using it** (MB.46), via
  `scripts/assert-pulled-env.ts`. It does two things. It **asserts** the keys
  that job needs, failing with a named cause (missing · empty · placeholder ·
  not a postgres URL · scheme without `user@host/database` · surviving quotes
  or whitespace · a libpq client-only parameter, MB.49) rather than letting the
  value reach a consumer that cannot describe it. `deploy` requires
  `DATABASE_URL` and `BETTER_AUTH_SECRET`, both of which the override step
  above has just written into the file. `migrate` requires **nothing** and runs
  report-only: since MB.47 its `DATABASE_URL` no longer comes from this file on
  either long-lived target, so requiring it here would fail on a value nothing
  reads. What that job validates instead is the **resolved** URL, one step
  later — see the probe below.

  And it **reports** every key the pull
  returned, with a classification and its length, never a value; that report
  prints even when the run is about to fail.

  The report is the half worth having. CI previously could not answer "what did
  the pull actually return?" — `migrate.yml` masked the value before anything
  could print it, and `deploy.yml` never read the file at all, handing it
  straight to `vercel build`. So MB.27 dropping variables produced
  `ERR_INVALID_URL` with the input shown as `***` in one job and
  `BETTER_AUTH_SECRET is not set` in the other, and neither said which
  variables had survived the pull. Key names are not secret —
  `claude-docs/secrets.md` enumerates them — and that no value is ever printed
  is asserted in `tests/guards/pulled-env-assertion.test.ts` rather than
  intended. The same file sweeps the workflow directory, so a `vercel pull`
  added without an assertion beside it fails in the diff that adds it.

  Why `deploy` needs `BETTER_AUTH_SECRET` in particular: `vercel build` runs
  `next build` with `NODE_ENV=production`, which traces
  `/api/auth/[...all]` → `src/lib/auth.ts` → `src/db/connection.ts`.
  `auth.ts` throws on an unset secret, and `connection.ts` calls `postgres()`
  at module scope, which parses its URL eagerly. A placeholder is therefore not
  harmless to a build that issues no query.

- **Both jobs then open the connection, before anything consumes it** (MB.49),
  via `scripts/probe-database.ts`. It reads a connection string from a file,
  connects, and runs `select 1`; on success it prints the role, database and
  server version that answered, and on failure the driver's own error code and
  message — scrubbed of the credentials, never the URL.

  It exists because `drizzle-kit migrate` catches whatever postgres.js throws
  and exits 1 without printing it. A failed staging migration said exactly
  this, and nothing else:

  ```
  Using 'postgres' driver for database querying
  [⣟] applying migrations...
  ##[error]Process completed with exit code 1.
  ```

  Reproduced locally, an unreachable host, a wrong password, an `sslmode`
  mismatch and a `channel_binding` parameter **all produce that byte-identical
  output**. Four different fixes, one indistinguishable failure — which is why
  MB.45, MB.46 and MB.47 each ended on a hypothesis rather than a diagnosis.
  `ECONNREFUSED`, `ENOTFOUND`, `28P01`, `3D000` and `42704` now each name
  themselves, and the codes worth a sentence carry one.

  **It is fatal in `migrate` and advisory in `deploy`, deliberately.** A
  migration cannot proceed without a connection, so a probe that warned there
  would leave the job as silent as it was. A build genuinely does not need the
  database — it parses the URL without issuing a query — so failing a deploy on
  a transient blip would trade one outage for another; what the warning buys is
  that a deploy about to serve 500s says so at build time.
  `tests/guards/database-probe.test.ts` asserts the two apart, and sweeps the
  workflow directory so a job that migrates or builds without probing first
  fails in the diff that adds it.

  **In `migrate` it reads the resolved URL, not the pulled file**, and that is
  the point rather than a detail. MB.46 validated what `vercel pull` wrote;
  MB.47 then took `DATABASE_URL` from a GitHub secret instead and handed it
  straight to drizzle-kit, reopening the gap one task after it closed. So
  `Resolve DATABASE_URL` now writes whichever value won to
  `$RUNNER_TEMP/resolved.env` under `umask 077`, and the probe reads that —
  secret or pulled `POSTGRES_URL` alike. The value reaches the script as a file
  path for the same reason MB.46's does: argv is visible to `ps` and echoed by
  `set -x`, and a step-level `env:` is printed in that step's own env block.

  **`channel_binding` has its own rule**, in the validator rather than the
  probe, so it fails before a connection is even attempted. postgres.js
  consumes `sslmode` and the keys in its own `defaults`, then forwards every
  remaining query parameter to the server as a **startup parameter** — so a
  libpq _client-side_ option reaches a server that has never heard of it and
  gets `42704 unrecognized configuration parameter "channel_binding"`. Neon's
  console puts it in the connection strings it hands you by default, which is
  why it is worth a named rule rather than a note; `sslmode=require` on its own
  is fine and is what actually requests TLS.

- **The reference seeds (M4.3, M4.3a, MB.93) are one step inside `migrate.yml`,
  not a workflow of their own.** After the migrations, `npm run
db:seed:categories`, `npm run db:seed:forms` and `npm run db:seed:astrology`
  write DESIGN.md §6's category vocabulary and §5's ingredient form, planet and
  zodiac vocabularies into the schema they just created, when the
  `seed-reference` input says so. One step for all three, sharing a gate, a log
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
- **`deploy.yml` gains one job, `seed-changed`**, which diffs
  `github.event.before`..`github.sha` over the seeds' own files
  (`src/db/seed/categories.ts`, `src/db/seed/forms.ts`,
  `src/db/seed/astrology.ts`, `src/db/seed/flat-vocabulary.ts`,
  `src/db/seed/bootstrap-admin.ts`, `src/lib/slugify.ts`, `scripts/db-seed.ts`)
  and hands `migrate` the answer — one gate for every vocabulary, so a change
  to any seed runs all three.
  Two things about it are load-bearing. It carries **no job-level `if:`**: a
  skipped dependency skips its dependents, so gating the job on
  `github.event_name == 'push'` would take every hotfix preview deploy down
  with it — non-push events answer `changed=false` from inside the step
  instead. And an unusable `before` (a new branch, or a force-push past what
  the runner fetched) seeds rather than guesses: the seed is additive, so a
  false positive costs one extra `npm run` where a false negative is an empty
  vocabulary in production.
