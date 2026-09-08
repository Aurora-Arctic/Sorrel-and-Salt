# Sorrel and Salt — Work Breakdown

185 tasks across 12 milestones, 300 estimated hours. Every task is one PR, sized 1–2 hours, reviewable in under 15 minutes.

Story references point at the numbered user stories in §10 of the design doc. Infrastructure tasks carry developer-facing stories instead.

## Standing rules

- One task per PR. Do not combine tasks, even small adjacent ones.
- Two access paths, one set of rules. Server components read through cache()-wrapped services. Everything the browser initiates — every mutation, and every read without a navigation — goes through GraphQL. Admin is not an exception to either (M3.8).
- Services are the authorization boundary. Both paths end there, so a permission enforced once holds for both. No server actions, no bespoke route handlers, no admin-only access path.
- The OAuth handshake at /api/auth/* is outside both paths and carries no application data (M2.2).
- A task is done when every acceptance criterion is demonstrably met, not when the code appears to work.
- Source repo for all ports is resume-2026. Port, do not rewrite from memory.
- No print styles anywhere except the spell recipe view (M10.22).
- The design will change. Do not build component styling beyond the tokens and mixins in M0.7 and M0.8.
- Tests never touch Neon. Neon is deployment-only.
- Staging carries the same protections as production. Local development is the only relaxed environment.
- There are no personal workspaces. Every workspace can take members and be deleted by an owner.
- The site is invite-gated. Signing in with Google or GitHub earns an account and nothing else. Creation rights come from accepting a workspace invitation (M7.5) or an admin approval (M5.8), and once held they persist.

## Deferred to v2

Notes are out of scope for v1. That removes stories 35–46 and the whole notes data layer, UI and visibility model — 17 tasks and 29 hours. Two consequences carried into the tasks below: viewers are now strictly read-only, since their own private notes were the sole exception; and the ingredient detail page (M8.19) is built so a notes section can be added beneath it without restructuring the page.

Also deferred: edit history, viewer spell approval, compendium suggestions and merge tooling, GraphQL response caching, and email/password sign-in.

## M0 — Repo, tooling & environment

_28 tasks · 37 hours_

**Sequencing**

- M0.6 blocks M0.7 and M0.8 — the semantic tokens and mixins derive from the base palette, so picking it late means redoing them.
- M0.18 blocks M0.19 and the final image tag in M0.13.
- M0.18 ships an image with extensions and an empty template only. Migrations and seed are baked in later, by M1.27. Do not try to bake a schema that does not exist yet.

### Repo bootstrap

**M0.1 — Scaffold Next.js 15 App Router with strict TypeScript** · 1h

_Story:_ As a developer, I want a running Next.js 15 App Router project with strict TypeScript so that every later task builds on the framework the design doc chose.

Create the app skeleton with the App Router, `strict: true` and `noEmit: true` in tsconfig, and the `src/` layout from §3 of the design doc (app, components, services, db, graphql, lib, scss) as empty directories with .gitkeep.

_Acceptance criteria:_

- `npm run dev` serves a page on port 8000
- `npx tsc --noEmit` passes with strict mode on
- Directory skeleton matches §3 exactly
- No Pages Router files present

**M0.2 — Port Oxlint config with Next.js node-globals override** · 1h

_Story:_ As a developer, I want the same lint rules as resume-2026 so that code style is consistent across my repos and CI can gate on it.

Copy `.oxlintrc.json` verbatim, then swap the `gatsby-*.ts` node-globals override for `next.config.ts`, `drizzle.config.ts`, `src/db/**`, and `src/app/**/route.ts`.

_Acceptance criteria:_

- `npm run lint` passes on the scaffolded repo
- Node globals resolve without error in the four override paths
- No Gatsby-specific overrides remain

**M0.3 — Port Prettier config and pre-commit hook** · 1h

_Story:_ As a developer, I want formatting enforced before commit so that no PR review is spent on whitespace.

Copy `.prettierrc` and `.prettierignore`, install the `pre-commit` npm package, and set the array to `['lint', 'format:check', 'typecheck']`.

_Acceptance criteria:_

- `npm run format:check` passes
- A commit with badly formatted code is blocked locally
- The pre-commit array matches resume-2026

**M0.4 — Port makefile and npm scripts, drop Gatsby helpers** · 2h

_Story:_ As a developer, I want the familiar make targets so that I run the same commands in both repos.

Port the makefile wrapper. Point `dev`/`build`/`start` at Next.js. Remove `predevelop`, `prebuild`, `postclean` and the `Docker/link-public.js` and `Docker/clean.js` Gatsby workarounds. Add placeholders for `db:generate`, `db:migrate`, `db:seed`, `db:reset`, `codegen`.

_Acceptance criteria:_

- `make help` lists every target
- `make build` produces a Next.js production build
- No Gatsby helper scripts remain in Docker/
- Database and codegen script names exist even if they exit non-zero for now

**M0.5 — Port only the foundational Sass partials** · 1h

_Story:_ As a developer, I want the minimum shared Sass so that styling can start without importing a design that is going to change anyway.

Copy only `_variables.scss`, `_mixins.scss` and `_typography.scss` into `src/scss/`. Do not port `_buttons.scss` or `_print.scss` — button styling will be redesigned, and print styling is needed for exactly one view (the spell recipe) and will be written there. Confirm `@use`, never `@import`.

_Acceptance criteria:_

- A component importing `@use '../../scss/variables' as *;` compiles
- `focus-ring()`, `theme-transition()` and `reduced-motion` all resolve
- No `_buttons.scss` or `_print.scss` in the repo
- No `@import` statements anywhere in src/scss

**M0.6 — Choose typefaces and base colour palette** · 2h

_Story:_ As a user, I want the app to look like a considered thing rather than a default so that it feels appropriate to what it holds.

Decision task. Pick a display and body typeface pairing and a base palette (surface, text, accent, and the light and dark variants of each). Record the choice and the reasoning in claude-docs, and set them in `_variables.scss` and `_typography.scss`. This is a deliberate blocker for the semantic tokens that follow.

_Acceptance criteria:_

- Typeface pairing chosen, licensed for the intended use, and self-hosted or loaded with a documented strategy
- Base palette defined for both light and dark themes
- Every text-on-surface pairing meets 4.5:1
- Decision and rationale recorded in claude-docs
- Font loading does not cause a layout shift on first paint

**M0.7 — Add category-group and safety design tokens** · 1h

_Story:_ As a user, I want categories and safety warnings to be visually distinguishable so that I can scan a page without reading every label.

Building on the base palette, extend `_variables.scss` with 8 category-group colours matching §6's groups and a safety-badge palette.

_Acceptance criteria:_

- 8 group colours defined and named after the groups in §6
- All new colours meet 4.5:1 contrast against their intended background
- Derived from the M0.6 base palette rather than picked independently

**M0.8 — Add modal-surface, chip and badge mixins** · 2h

_Story:_ As a developer, I want shared mixins for the three new UI primitives so that modals, chips and badges are consistent everywhere they appear.

Add `modal-surface()`, `chip()` and `badge()` to `_mixins.scss`, each honouring the existing `theme-transition()` and `reduced-motion` conventions.

_Acceptance criteria:_

- Each mixin compiles in isolation
- `chip()` supports selected and unselected states
- `badge()` accepts a palette argument for safety vs low-stock
- All three respect prefers-reduced-motion

**M0.9 — Scaffold claude-docs, README and CLAUDE.md** · 1h

_Story:_ As a developer, I want the documentation convention in place from commit one so that subsystem docs accumulate instead of being retrofitted.

Create `claude-docs/` with a subsystem summary stub, the append-only transcript file, and a `components/` directory. Write README and CLAUDE.md covering vocabulary (compendium / ingredients / grimoire), commands, and the coverage rule about running `:coverage` variants.

_Acceptance criteria:_

- claude-docs structure matches the resume-2026 convention
- CLAUDE.md states the three domain nouns and their meanings
- CLAUDE.md records that verification uses the `:coverage` script variants
- README explains local setup in under ten steps

**M0.10 — Port applicable Claude skills from resume-2026** · 2h

_Story:_ As a developer, I want my existing agent skills available in this repo so that the assistant follows the same conventions here without being re-taught them.

Review the skills in resume-2026 and port the ones that apply — testing conventions, component documentation, commit and PR conventions, CI debugging. Leave behind anything Gatsby-specific. Adjust paths and command names to this repo, and note in CLAUDE.md which skills exist and when each applies.

_Acceptance criteria:_

- Ported skills live in the conventional skills directory and are discoverable
- Every ported skill references commands that actually exist in this repo
- Gatsby-specific skills are excluded, not copied and edited into uselessness
- CLAUDE.md lists the available skills and their triggers

### Local dev environment

**M0.11 — Slim two-stage Dockerfile.node** · 2h

_Story:_ As a developer, I want a small image so that pulls, CI cold starts and rebuilds stay fast.

Write a slim `Docker/Dockerfile.node` on an alpine or slim Node base with two stages — `development` and `testing` — rather than porting the three-stage resume-2026 file wholesale. The devcontainer consumes the development stage instead of getting its own. Layer-cache dependencies separately from source.

_Acceptance criteria:_

- Both stages build
- Final image is materially smaller than the resume-2026 equivalent, with the number recorded
- A source-only change does not reinstall dependencies
- `testing` stage can run vitest

**M0.12 — Port docker-compose, drop Gatsby LMDB volume** · 1h

_Story:_ As a developer, I want a working compose file so that `make docker-up` gives me the app without local Node version juggling.

Copy `docker-compose.yaml`, keep the `node_modules` volume, remove the Gatsby LMDB cache volume.

_Acceptance criteria:_

- `make docker-up` starts the app container
- node_modules volume persists across restarts
- No LMDB volume remains

**M0.13 — Add the Postgres service to docker-compose** · 2h

_Story:_ As a developer, I want a local Postgres so that tests exercise RLS, triggers and pg_trgm rather than a substitute that cannot.

Add the Postgres service with a named volume and a health check, wired to the same image tag that CI will use once M0.18 publishes it. Set `DATABASE_URL` for the app and devcontainer services.

_Acceptance criteria:_

- `make docker-up` starts Postgres 17 and reports healthy
- App container connects using the service name
- Data survives `docker compose restart`
- No Neon connection is required for local work

**M0.14 — Port devcontainer against the development stage** · 1h

_Story:_ As a developer, I want the devcontainer to come up with a database attached so that a fresh clone is productive immediately.

Copy `.devcontainer/`, point it at the `development` stage of the slim Dockerfile, add `depends_on: postgres` with the health condition, and forward ports 8000 and 8001.

_Acceptance criteria:_

- Devcontainer opens and installs dependencies
- Postgres is reachable from inside it
- No dedicated devcontainer image stage exists
- Both ports forward correctly

### CI pipeline port

**M0.15 — Port shared composite actions** · 1h

_Story:_ As a developer, I want the reusable composite actions available so that each check workflow stays a thin wrapper.

Copy the shared composite actions from resume-2026 unchanged, adjusting any hardcoded repo name.

_Acceptance criteria:_

- Composite actions resolve when referenced locally
- No references to the resume-2026 repo remain
- At least one workflow consumes each action successfully

**M0.16 — Port lint, format and typecheck workflows** · 1h

_Story:_ As a reviewer, I want style and type checks on every PR so that review time goes to logic.

Copy the three reusable per-check workflows and confirm each runs its npm script inside the testing container image.

_Acceptance criteria:_

- Each workflow runs green on the scaffolded repo
- Each fails when its check is deliberately broken
- All three run inside the container, not on the runner host

**M0.17 — Port build and audit workflows** · 1h

_Story:_ As a developer, I want build and dependency-audit checks so that a broken build or a known vulnerability never reaches staging.

Copy the reusable `build` and `audit` workflows, pointing build at the Next.js output.

_Acceptance criteria:_

- Build workflow produces and caches the .next output
- Audit workflow fails on a seeded high-severity advisory
- Both are referenced from pr-gate

**M0.18 — Build and publish the base Postgres image to GHCR** · 2h

_Story:_ As a developer, I want one database image shared by CI and local development so that every environment starts from an identical Postgres in seconds.

Workflow building a Postgres 17 image with required extensions enabled and an empty `sorrel_template` database, published to GHCR. Tag by content hash of `src/db/**` plus `latest`; rebuild only when that path changes. Migrations and seed are baked into the template by M1.27, once they exist — this task deliberately ships the image before there is a schema to put in it.

_Acceptance criteria:_

- Image publishes to GHCR and is pullable by other workflows and locally
- Extensions are enabled at build time, not at container start
- An empty sorrel_template database exists in the image
- Tag changes when src/db changes and does not when it does not
- Rebuild is skipped for PRs that do not touch src/db

**M0.19 — Consume the preseeded image in CI and compose** · 1h

_Story:_ As a developer, I want CI and local development to use the same database image so that a data-layer bug reproduces identically in both.

Point the CI job `services:` and the compose Postgres service at the published GHCR tag. Cache the pull between jobs.

_Acceptance criteria:_

- A `SELECT 1` succeeds from inside the job container
- Compose and CI reference the same tag from one place, not two literals
- Pull is cached between jobs in a run
- Health check gates the test step

**M0.20 — Port pr-gate.yml** · 1h

_Story:_ As a reviewer, I want one gate aggregating every check so that a PR's mergeability is a single signal.

Copy `pr-gate.yml` and wire it to the reusable workflows ported so far. Leave vitest and playwright references stubbed until M1.

_Acceptance criteria:_

- Opening a PR triggers the gate
- Gate fails if any child check fails
- Stubbed references do not break the run

**M0.21 — Port merge-queue.yml and enable the queue on both branches** · 1h

_Story:_ As a developer, I want a merge queue so that main and staging never receive an untested merge combination.

Copy `merge-queue.yml`. Manually enable Require merge queue in Settings → Branches on both `main` and `staging` — without this the workflow never fires.

_Acceptance criteria:_

- Merge queue enabled on main and staging
- A queued PR triggers the workflow
- Setup step documented in claude-docs

**M0.22 — Port gitflow workflow and branch rulesets** · 2h

_Story:_ As a developer, I want the Gitflow rules enforced so that branch discipline does not depend on memory.

Copy the `gitflow` reusable workflow. Mirror branch rulesets onto `main` and `staging`. Confirm `feature/*` → `staging`, `release/MAJOR.MINOR.PATCH` promotion, `hotfix/*` opening both PRs, and `main-sync/YYYY-MM-DD-HH-MM-SS`. Configure Dependabot to target `staging`, exempt by author.

_Acceptance criteria:_

- A feature branch PR targeting main is rejected
- Release branch naming is validated
- Dependabot PRs target staging and skip the author-exempt check
- Rulesets identical on both branches

_*M0.23 — Port .actrc and make act-* targets_* · 1h

_Story:_ As a developer, I want to run workflows locally so that CI debugging does not require pushing commits.

Copy `.actrc` and the `make act-*` targets, adjusting image references if needed.

_Acceptance criteria:_

- `make act-lint` runs the lint workflow locally
- At least one act target completes green
- Image references resolve without manual pulls

**M0.24 — Port build-image.yml with new GHCR tag** · 1h

_Story:_ As a developer, I want the application container image published so that CI and the devcontainer pull a prebuilt image instead of rebuilding.

Copy `build-image.yml`, changing the GHCR tag to the Sorrel-and-Salt repo. Distinct from the database image in M0.18.

_Acceptance criteria:_

- Image publishes to ghcr.io under the new repo name
- CI workflows pull the published tag
- No resume-2026 tag references remain

### Vercel setup

**M0.25 — Connect repo to Vercel and restrict branch deploys** · 1h

_Story:_ As a developer, I want only main and staging to deploy so that build minutes and function meters are not spent on every feature branch.

Connect the repo to a Vercel Hobby project. Add `vercel.json` with `git.deploymentEnabled` set true for `main` and `staging` only.

_Acceptance criteria:_

- A push to a feature branch produces no deployment
- A push to staging deploys
- vercel.json is committed, not configured only in the dashboard

**M0.26 — Disable deploy previews and alias staging** · 1h

_Story:_ As a developer, I want a stable staging URL so that OAuth callbacks and manual testing have a fixed target.

Turn off deploy previews in project settings. Map the `staging` branch to a stable Preview alias.

_Acceptance criteria:_

- Deploy previews are off
- Staging resolves at a fixed URL across deploys
- Production alias points at main

**M0.27 — Define environment variable and secrets matrix** · 1h

_Story:_ As a developer, I want every secret named and scoped up front so that no environment is discovered to be missing one mid-deploy.

Document and set: the production and staging Neon connection strings, `BETTER_AUTH_SECRET`, Google and GitHub OAuth client id and secret, admin bootstrap email. Record which are Vercel-managed versus GitHub Actions secrets.

_Acceptance criteria:_

- Matrix table committed to claude-docs
- Production and staging connection strings differ and point at different Neon branches
- All variables set for Production and Preview
- GitHub Actions secrets set for the migrate workflow
- No credentials required to run tests locally

**M0.28 — Deploy hello-world from staging and promote to production** · 2h

_Story:_ As a developer, I want the whole pipeline proven end to end before any feature work so that deploy problems surface while the app is trivial.

Merge a trivial page to `staging`, confirm the Preview deploy, then run a `release/0.0.1` promotion to `main` and confirm Production.

_Acceptance criteria:_

- Staging URL serves the page
- Release branch promotion succeeds through the merge queue
- Production URL serves the page
- Build time recorded in claude-docs as a baseline

## M1 — Database foundation

_28 tasks · 45 hours_

**Sequencing**

- M1.5 must land before any migration touching an existing column. It is the reason no down migrations exist in this repo.
- M1.21 and M1.22 block M1.27, which is in turn what makes M1.9 a clone rather than a setup routine.
- M1.16 blocks every service from M2 onward. No feature code writes to the database before the choke point exists, or audit columns start rotting immediately.
- This milestone gates the entire project. Nothing in M2+ should start before it closes.

### Neon and Drizzle

**M1.1 — Create Neon project and wire the Vercel integration** · 1h

_Story:_ As a developer, I want deployment databases provisioned so that staging and production have isolated data from the first migration.

Create one Neon project with `production` as the default branch and `staging` as a child branch of it, so staging can be reset from production data without a second project. Install the Neon Vercel integration so `DATABASE_URL` is injected per environment. Neon is deployment-only — tests never touch it.

_Acceptance criteria:_

- Two branches in one project: production and staging
- Staging and production connection strings exist and differ
- Branch and storage usage checked against the current free-tier limits
- DATABASE_URL resolves in both Vercel environments
- Scale-to-zero behaviour noted in claude-docs with the ~1s resume expectation
- No Neon credentials are needed to run tests

**M1.2 — Install Drizzle and add the connection module** · 2h

_Story:_ As a developer, I want a single typed database client so that every query path goes through one configured connection.

Add `drizzle-orm`, `drizzle-kit` and the Postgres driver. Write `drizzle.config.ts` and a connection module that reads `DATABASE_URL`. Export nothing that bypasses the repository layer.

_Acceptance criteria:_

- A trivial query runs against local Postgres
- The same code connects to Neon when DATABASE_URL points there
- Connection module is the only place the driver is instantiated

**M1.3 — Add database npm scripts and the first migration** · 2h

_Story:_ As a developer, I want migration commands wired before any schema exists so that every table arrives through the same mechanism.

Implement `db:generate`, `db:migrate`, `db:seed`, `db:reset`. Generate and apply an initial migration enabling required extensions.

_Acceptance criteria:_

- `npm run db:migrate` applies cleanly to an empty database
- Re-running is idempotent
- Migration files are committed, not generated at deploy time

**M1.4 — Add migrate.yml for staging and production** · 2h

_Story:_ As a developer, I want migrations applied automatically on merge so that a deploy never runs against an older schema.

Workflow applying migrations to staging on merge to `staging` and to production on merge to `main`. Migrations run before the new deploy goes live, which is only safe because every migration is additive under the M1.5 policy.

_Acceptance criteria:_

- Merge to staging applies pending migrations
- Merge to main applies them to production
- Workflow fails loudly and blocks the deploy on a migration error
- Completes before the Vercel deploy is promoted
- Concurrent runs are serialised so two merges cannot migrate at once

**M1.5 — Adopt expand/contract and add a destructive-DDL check** · 2h

_Story:_ As a developer, I want the schema to stay compatible with the previous app version so that reverting a bad release is a deploy rollback and never a database rollback.

Drizzle generates no down migrations, and writing them by hand is a reliable way to lose data. Instead, adopt expand/contract: every migration must work against both the old and new application code. Adding a column is additive; renaming one is add, backfill, dual-write, then drop in a later release. Add a CI check that flags DROP COLUMN, DROP TABLE, RENAME, type narrowing and NOT NULL additions, failing unless the PR body carries an explicit acknowledgement line. Document the policy and the forward-fix convention in claude-docs.

_Acceptance criteria:_

- Policy documented with a worked rename example across two releases
- CI check flags each destructive DDL form
- Check passes when the acknowledgement line is present, fails when it is not
- Reverting the app one version leaves it working against the migrated schema
- No down-migration files exist anywhere in the repo

**M1.6 — Snapshot before production migrations and drill the restore** · 2h

_Story:_ As an operator, I want a known-good point to return to so that a migration that corrupts data is recoverable rather than merely regrettable.

Before migrating production, the workflow creates a Neon branch from the current production state, named by commit sha. Write the recovery runbook: how to promote that branch back, what the data-loss window is, and who decides. Then actually rehearse it once against staging rather than assuming it works.

_Acceptance criteria:_

- A snapshot branch is created before every production migration
- Branch name identifies the commit it precedes
- Runbook states the exact promotion steps and the data-loss window
- Restore has been performed once against staging and the result recorded
- Old snapshot branches are pruned on a schedule so the branch quota is not exhausted

### Test harness

**M1.7 — Configure Vitest with unit and db projects** · 2h

_Story:_ As a developer, I want two test projects so that pure logic runs fast in jsdom while data-layer tests get a real Postgres connection.

`vitest.config.ts` with a `unit` project (jsdom) and a `db` project (node, local Postgres). Keep the 80% threshold on lines, branches, functions and statements. Upload coverage artifacts.

_Acceptance criteria:_

- `npm run test:coverage` runs both projects
- Thresholds fail the run when coverage drops below 80%
- db project connects to the compose Postgres, not Neon
- Coverage artifact uploads in CI

**M1.8 — Port vitest.setup.ts** · 1h

_Story:_ As a developer, I want the existing test setup carried over so that RTL and jsdom quirks are already solved.

Port `afterEach(cleanup)` and the localStorage polyfill — Node's native global still shadows jsdom's — plus MSW server lifecycle hooks.

_Acceptance criteria:_

- Components unmount between tests
- localStorage is writable in jsdom tests
- MSW starts and resets around each test

**M1.9 — Clone a per-worker test database from the baked template** · 1h

_Story:_ As a developer, I want isolated databases per Vitest worker so that parallel data-layer tests cannot interfere, without maintaining a test-database harness to get it.

A `globalSetup` helper of roughly ten lines: each worker runs `CREATE DATABASE sorrel_test_${VITEST_WORKER_ID} TEMPLATE sorrel_template` and drops it on teardown, with a drop-if-exists first so a crashed run self-heals. Postgres copies template files directly, so this is fast enough to need no further optimisation. Rejected alternative, with the reasoning recorded in claude-docs: wrapping each test in a transaction that rolls back. It reads cleaner but breaks here, because `withAudit` opens its own transaction and `SET LOCAL app.current_user_id` would escape the savepoint into the outer wrapper, leaking one test user's identity into the next assertion — precisely the thing these tests exist to verify.

_Acceptance criteria:_

- Two workers writing the same table do not collide
- No migrations run at test time
- A crashed previous run leaves nothing to clean up by hand
- Setup is small enough to read in one screen
- The rejected transaction-rollback approach and its reason are recorded

**M1.10 — MSW server and GraphQL handler stub** · 1h

_Story:_ As a developer, I want component tests to mock the GraphQL endpoint so that they never require a running server.

Set up the MSW node server with a stub handler for `/api/graphql`, and a helper for per-test response overrides.

_Acceptance criteria:_

- A component test can override a single operation's response
- Unhandled requests fail loudly rather than silently
- Handlers reset between tests

**M1.11 — Configure Playwright on port 8001 with local Postgres** · 2h

_Story:_ As a developer, I want e2e runs against a production build and a real database so that they catch what component tests cannot.

`playwright.config.ts` with `webServer` running `npm run build && npm run start` on 8001, preserving separation from the dev server on 8000. `globalSetup` prepares `sorrel_e2e`; specs truncate and reseed between files.

_Acceptance criteria:_

- A smoke spec passes locally and in CI
- Dev server on 8000 can run simultaneously
- sorrel_e2e is reseeded between spec files
- No Neon connection involved

**M1.12 — Wire axe-core into Playwright** · 1h

_Story:_ As a user relying on assistive technology, I want the app to meet accessibility standards so that I can use every page and modal.

Add `@axe-core/playwright` and a reusable scan helper. Assert accessibility here rather than via vitest-axe, matching the resume-2026 pattern.

_Acceptance criteria:_

- Scan helper is callable from any spec
- A seeded violation fails the run
- Smoke spec scans at least one page

**M1.13 — Wire monocart coverage for e2e** · 1h

_Story:_ As a developer, I want e2e coverage reported so that the two suites' contributions are visible separately.

Configure `monocart-coverage-reports` for the Playwright run and upload the artifact.

_Acceptance criteria:_

- Coverage report generated after an e2e run
- Artifact uploads in CI
- Report is separate from the Vitest report

**M1.14 — Port vitest and playwright CI workflows with path filters** · 2h

_Story:_ As a developer, I want test jobs skipped for docs-only changes so that trivial PRs are not slowed by the full suite.

Port the two reusable workflows, add the Postgres service, and path-filter so documentation-only changes skip them.

_Acceptance criteria:_

- Both workflows run green on a code PR
- A docs-only PR skips them and still satisfies the gate
- Both use the CI Postgres service

### Audit and repository

**M1.15 — Implement auditColumns and applyAudit with unit tests** · 2h

_Story:_ As an owner, I want every record to carry who created and last changed it so that a shared workspace has an accountable history.

Write `src/db/audit.ts` exporting the six-column spread. Implement `applyAudit()` covering insert, update and soft delete. Unit test each case.

_Acceptance criteria:_

- Insert sets created_at, created_by, updated_at, updated_by
- Update leaves created_at and created_by untouched
- Soft delete sets deleted_at and deleted_by only
- Ids in the payload are ignored in favour of session ids

**M1.16 — Implement repository.ts with withAudit** · 2h

_Story:_ As a developer, I want one write path so that audit stamping cannot be skipped by a new call site.

Implement `withAudit(session, fn)` as the only exported write mechanism. It opens the transaction, injects audit ids, and is the sole module importing the database client.

_Acceptance criteria:_

- A write outside withAudit is impossible through the public API
- Audit ids come from the session, never the request body
- Transaction rolls back cleanly on error

**M1.17 — Add lint rule banning db imports outside repository.ts** · 1h

_Story:_ As a reviewer, I want the choke point enforced mechanically so that I do not have to catch violations by eye.

Add an Oxlint restriction on importing the database client anywhere except `src/db/repository.ts`.

_Acceptance criteria:_

- A deliberate violation fails `npm run lint`
- repository.ts itself is exempt
- Rule runs in pr-gate

**M1.18 — Add updated_at trigger migration** · 1h

_Story:_ As an owner, I want updated_at to be correct even after a manual database fix so that the audit trail cannot be quietly bypassed.

Migration adding a trigger function and attaching it to every audited table, so `updated_at` is set by the database rather than application code.

_Acceptance criteria:_

- A raw psql UPDATE still stamps updated_at
- Application updates are not double-stamped inconsistently
- Trigger attaches automatically for tables added later, or the pattern is documented

**M1.19 — Set app.current_user_id GUC per transaction** · 1h

_Story:_ As a developer, I want the current user available to the database so that RLS policies can enforce access independently of application code.

Inside `withAudit`, issue `SET LOCAL app.current_user_id = '<uuid>'` at transaction start.

_Acceptance criteria:_

- current_setting('app.current_user_id') returns the acting user inside a transaction
- The value does not leak across pooled connections
- A write without a session is rejected

**M1.20 — Repository-level soft-delete filtering and the partial-index convention** · 2h

_Story:_ As a user, I want deleted records to stay recoverable but invisible so that a mistaken delete is not permanent and does not clutter my lists.

Every exported finder applies `deleted_at IS NULL`. No call site does its own filtering. Document the partial unique index convention: without the WHERE clause, deleting a record permanently blocks reusing its name.

_Acceptance criteria:_

- No exported query can return a soft-deleted row
- A dedicated escape hatch exists for admin restore paths and is clearly named
- Convention documented in claude-docs with an example index

### Seed and acceptance harness

**M1.21 — Seed module with the minimal scenario** · 2h

_Story:_ As a developer, I want one seed module used by Docker, Vitest and Playwright so that a bug reproduces identically in all three.

`src/db/seed/index.ts` exporting `seed(db, { scenario })`. Implement `minimal`: one admin, one user, empty compendium.

_Acceptance criteria:_

- Seed runs from a script, a test, and the Docker init hook
- Re-running is idempotent or explicitly truncates first
- minimal produces exactly one admin and one user

**M1.22 — Standard scenario with fixture users A–E** · 2h

_Story:_ As a developer, I want a fixed cast of users and workspaces so that authorization tests read clearly and consistently.

Implement `standard`: A owner of W, B member of W, C viewer in W, D member of unrelated X, E site admin in no workspace. Populated compendium.

_Acceptance criteria:_

- All five users exist with the documented roles
- Workspaces W and X exist and share no members
- E belongs to no workspace
- Compendium has enough entries to exercise search

**M1.23 — Demo scenario with spells** · 2h

_Story:_ As a developer, I want realistic seeded content so that manual testing and screenshots show the app as a user would see it.

Implement `demo`: standard plus spells in W's grimoire with ingredients and layer order.

_Acceptance criteria:_

- At least two spells with ingredients and layer order
- Spells reference a mix of compendium and workspace-local ingredients
- Reseeding does not duplicate rows

**M1.24 — Docker seed hook and make db-reset** · 1h

_Story:_ As a developer, I want a one-command reset so that a corrupted local database is never a blocker.

Wire the seed module into the Postgres init script and add `make db-reset` to drop, migrate and reseed.

_Acceptance criteria:_

- `make db-reset` completes from a broken state
- First `make docker-up` on a clean volume seeds automatically
- Scenario is selectable by environment variable

**M1.25 — Fixture factories** · 2h

_Story:_ As a developer, I want factories with sensible defaults so that tests state only what they are actually testing.

Add `fixtures/` factories — `makeIngredient`, `makeNote`, `makeSpell`, `makeWorkspace` — with overrides, so tests read `makeIngredient({ categories: ['protection'] })`.

_Acceptance criteria:_

- Each factory works with zero arguments
- Overrides merge rather than replace nested defaults
- Factories are used by at least one existing test

**M1.26 — asUser helper and Forbidden error type** · 1h

_Story:_ As a developer, I want a uniform way to act as a fixture user so that authorization tests are one line rather than five.

Implement `asUser(A)` returning a session context, and a `Forbidden` error the services throw so tests can assert on the type rather than a message string.

_Acceptance criteria:_

- asUser works for all five fixture users
- Forbidden is distinguishable from a not-found error
- A denied call rejects rather than returning empty

**M1.27 — Bake migrations and the standard seed into the database image** · 2h

_Story:_ As a developer, I want the shared image to carry a ready-to-clone template so that no environment spends time migrating or seeding before it can run a test.

Extend the M0.18 image build: apply migrations and the standard scenario into `sorrel_template` at build time. This closes the dependency that M0.18 deliberately left open, and is what makes M1.7 a clone rather than a setup routine.

_Acceptance criteria:_

- Template contains the full schema and the standard scenario
- Image tag changes when migrations or seed change
- A cloned database is immediately usable with no further setup
- CI and compose both pick up the new tag from one place
- Local and CI clones are byte-identical in content

**M1.28 — make test-stories with a per-story checklist** · 2h

_Story:_ As a product owner, I want a live checklist of which user stories pass so that progress is measured against requirements rather than coverage percentage.

Add the `tests/acceptance/` directory and a `make test-stories` target running only that suite and printing story ids with pass or fail. Track acceptance coverage separately from the 80% line threshold.

_Acceptance criteria:_

- Target runs only the acceptance suite
- Output lists story ids and status
- Acceptance coverage reported separately from unit coverage
- Suite runs in CI but does not double-count toward thresholds

## M2 — Auth and users

_9 tasks · 15 hours_

**Sequencing**

- M2.1 lands deliberately failing tests. Either exempt tests/acceptance from the CI gate until the milestone closes, or mark them skipped-with-reason and unskip as each is implemented.
- M2.3 (role column) blocks all of M5. Without it there is no admin to bootstrap.
- M2.7 (session helper) blocks every protected route and every service that takes a session.
- M2.8 replaces the old auto-created workspace. Signing in no longer produces one, so the three post-signup states must all be handled or new users hit a dead end.
- M2.9 is a scoping task whose output is a decision doc and a follow-up task, not code. Schedule the follow-up before a second admin is actually needed.

### Better Auth

**M2.1 — Acceptance test scaffold for stories 1–2** · 2h

_Stories 1–2 — As a developer, I want the account stories expressed as failing tests before implementation, so that done is measured against the specification rather than my own reading of it._

Create `tests/acceptance/01-accounts.test.ts` with failing tests naming stories 1 and 2. This PR intentionally lands red — it is the definition of done for the milestone.

_Acceptance criteria:_

- Both tests exist and fail for the right reason
- Each describe block names its story number and text
- make test-stories lists them as failing
- CI is configured to tolerate the acceptance suite failing until the milestone closes

**M2.2 — Install Better Auth with the Drizzle adapter** · 2h

_Story:_ As a developer, I want auth running in-process so that there is no extra service, no extra deploy and no extra cost.

Install Better Auth, configure the Drizzle adapter against Neon, and generate the auth tables migration. Mount the route handlers at `/api/auth/*`. This is the one deliberate exception to the GraphQL-only rule and it is not really an exception: OAuth callbacks are browser redirects from Google and GitHub carrying query params, and the session cookie is set on an HTTP response. None of that can travel over a GraphQL POST. The rule governs application data access — every query and mutation about ingredients, workspaces and spells — not the protocol handshake that establishes who you are.

_Acceptance criteria:_

- Auth tables created by migration, not by runtime bootstrapping
- Route handlers respond at /api/auth/*
- BETTER_AUTH_SECRET read from the environment
- No application data is readable or writable through the auth endpoints
- The exception and its boundary are recorded in claude-docs
- No separate service or container added

**M2.3 — Users table with role, creation rights and admin bootstrap** · 1h

_Story 18 precondition — As the site owner, I want admin rights to exist on a real account, so that someone can curate the compendium before anyone depends on it._

Add `users` with id, email, displayName, avatarUrl, role (`user` | `admin`), canCreateWorkspace and audit columns. Promote the first user matching the bootstrap env email. `canCreateWorkspace` defaults to false: signing in with Google or GitHub earns an account and nothing more. The flag turns true by one of two routes — accepting a workspace invitation (M7.5) or an admin granting it (M5.8) — and once true it stays true, so an established user can create as many workspaces as they like.

_Acceptance criteria:_

- A user matching the bootstrap email becomes admin on first sign-in
- All other users default to role user with canCreateWorkspace false
- Admins can create workspaces regardless of the flag
- Nothing in the OAuth flow sets the flag
- No API or UI path grants admin
- Role and creation rights are columns, not separate tables

**M2.4 — Configure the Google OAuth provider** · 1h

_Story 1 — As a new user, I want to sign in with Google, so that I don't have to manage another password._

Register the OAuth client, configure callback URLs for local, staging and production, and add the provider to Better Auth.

_Acceptance criteria:_

- Sign-in completes on local and staging
- Callback URLs registered for all three environments
- Client secret stored as a secret, not committed

**M2.5 — Configure the GitHub OAuth provider** · 1h

_Story 1 — As a new user, I want to sign in with GitHub, so that I don't have to manage another password._

Same as the Google provider, for GitHub.

_Acceptance criteria:_

- Sign-in completes on local and staging
- An existing account is matched by email rather than duplicated
- Callback URLs registered for all three environments

**M2.6 — Build the sign-in page** · 2h

_Story 1 — As a new user, I want one sign-in page offering Google and GitHub, so that I can get in without managing another password._

`/sign-in` with both OAuth buttons, an error state for a failed callback, and a redirect to the intended destination after success. Component test with role and label queries only.

_Acceptance criteria:_

- Both providers reachable by keyboard
- Failed callback shows a readable error, not a stack trace
- Post-sign-in redirect honours the original destination
- axe scan passes

**M2.7 — Session helper and route protection** · 2h

_Story:_ As a user, I want unauthenticated access blocked so that my grimoire is not reachable by anyone with the URL.

Server-side session helper used by layouts and services. Protect all authed segments, redirecting to `/sign-in` with the return path preserved.

_Acceptance criteria:_

- An unauthenticated request to a protected route redirects
- The return path survives the round trip
- Sign-in and invite acceptance remain publicly reachable
- Services receive the session rather than reading it themselves

**M2.8 — Post-signup landing for a user with no workspace** · 2h

_Story 2 — As a newly signed-in user, I want to be told plainly what I can do next, so that an empty account does not look like a broken one._

The site is invite-gated, so a new user does not get a workspace automatically. Three states to handle after sign-in: they accepted an invitation and are already a member, so send them there; they hold creation rights from a previous invitation or an admin grant, so offer the create form; they have neither, so explain that Sorrel and Salt is invite-only and that they need a link from someone who already uses it, or an admin's approval. The third state is what decides whether the product reads as exclusive or broken, so write it carefully and do not leave it as a bare empty page.

_Acceptance criteria:_

- An invited user lands in the workspace they were invited to
- A user with creation rights is offered the create form
- A user with neither sees a clear explanation, not an empty dashboard or an error
- The explanation says how to get in, and does not imply the account is faulty or pending review
- No workspace is created implicitly by signing in
- Story 2 acceptance test passes

**M2.9 — Scope a UI for granting admin** · 2h

_Story:_ As the site owner, I want a considered plan for granting admin rights so that promoting a second admin does not mean editing an environment variable and redeploying.

Scoping task, not an implementation. Bootstrapping by env email works for exactly one admin and stops there. Write up the options — admin-grants-admin, invitation-based, or a break-glass CLI — with the risks of each, what audit trail a grant needs, whether admin can be revoked and by whom, and what happens if the last admin is removed. Output is a short decision doc in claude-docs plus a follow-up task with acceptance criteria, sized like every other task here.

_Acceptance criteria:_

- At least three approaches described with their failure modes
- Covers granting, revoking, and the last-admin case
- States what the audit trail must record
- Ends with a written follow-up task ready to schedule
- No implementation in this PR

## M3 — GraphQL foundation

_10 tasks · 17 hours_

**Sequencing**

- Sits ahead of all feature work so that every request in the app — admin included — uses one endpoint, one context and one auth path. There is no second access convention anywhere in this project.
- M3.2 (Pothos builder and context) blocks every resolver from M4 onward.
- M3.5 (codegen) must land before any client-side query work.
- M3.6 (pagination helper) blocks every list query in the project. Landing it late means retrofitting bounds onto queries already written without them.
- M3.8 fixes the access boundary for the whole project and M3.9 enforces it. Land both before feature work, or the boundary erodes one convenient import at a time.
- The three DataLoaders are deliberately not here. Each sits with the schema it loads: M4.8, M6.17 and M10.10.

### GraphQL server

**M3.1 — Mount GraphQL Yoga at /api/graphql** · 2h

_Story:_ As a developer, I want a single GraphQL endpoint in-process so that the API adds no hosting cost and no separate deploy.

Yoga as a Next.js route handler, exported from `src/app/api/graphql/route.ts`. No Apollo integration shim.

_Acceptance criteria:_

- Endpoint responds to a trivial query
- Runs in the existing process, no new service
- GraphiQL available on local development only, not on staging

**M3.2 — Pothos builder and request context** · 2h

_Story:_ As a developer, I want a typed code-first schema so that a resolver returning the wrong shape is a compile error.

Set up the Pothos builder with the Drizzle plugin and an auth-scopes plugin. Context carries the session and per-request DataLoader instances.

_Acceptance criteria:_

- Schema builds and types are inferred from Drizzle tables
- Context exposes session and loaders
- Loaders are constructed per request, never module-level
- A wrong return shape fails typecheck

**M3.3 — Apply graphql-armor protections in staging and production** · 2h

_Story:_ As an operator, I want expensive or probing queries rejected everywhere the app is reachable so that a client cannot burn my compute budget or map the schema, and so the protections are exercised before they matter.

Add graphql-armor with a depth limit of 7 and a cost limit. Introspection and field suggestions are off in staging as well as production — staging is a public URL and gets real protections. `NODE_ENV` is the right signal: Vercel sets it to production for Preview builds, so staging is covered automatically and the rule reads as 'on only where the environment is not publicly reachable'.

_Acceptance criteria:_

- A query nested past depth 7 is rejected in every environment
- An expensive composed query is rejected by cost in every environment
- Introspection is off in staging and production, on under `next dev`
- Field suggestions are off in staging and production
- Verified against the deployed staging URL, not only in a test
- Noted that a local production build also disables them, which is correct and occasionally surprising

**M3.4 — Schema snapshot test** · 1h

_Story:_ As a reviewer, I want schema changes to be visible in the diff so that a contract change is never silent.

Write the SDL out on every run and snapshot it. This and design tokens are the only permitted snapshots.

_Acceptance criteria:_

- SDL file is committed and regenerated by the test
- An unintended schema change fails CI
- Snapshot update is a deliberate, reviewable step

**M3.5 — graphql-codegen and the staleness check** · 2h

_Story:_ As a developer, I want generated client types to match the schema so that the client cannot drift from the server.

Configure graphql-codegen for typed documents. Add `codegen.yml` to CI, failing if generated output is stale.

_Acceptance criteria:_

- Codegen produces typed documents and hooks
- CI fails when generated files are stale
- Generated files are committed

**M3.6 — Cursor pagination helper with a hard maximum page size** · 2h

_Story:_ As an operator, I want every list bounded by one shared rule so that no query can ask for the whole table, and no future list query can forget to say so.

Build the connection helper every list query uses: cursor-based, stable across inserts, with a default page size of 25 and a hard server-side maximum of 100. A client asking for more gets the maximum, not an error and not what it asked for. Cursors encode a stable sort key plus id, never an offset, so inserting a row does not shift a page under a reader. This pairs with the cost limit in M3.3: without a bound on list size the cost calculation has nothing to multiply, and depth limiting alone will not save you from one query for every ingredient with every category and spell attached.

_Acceptance criteria:_

- One helper used by every list query in the project
- Default 25, maximum 100, enforced server-side
- Requesting more than the maximum returns the maximum, silently and consistently
- Cursors encode sort key plus id, never an offset
- Pagination is stable when rows are inserted or soft-deleted mid-traversal
- Cost limit accounts for the requested page size
- A test walks a full multi-page traversal and asserts no row is skipped or repeated

### GraphQL client

**M3.7 — Wire graphql-request with TanStack Query** · 2h

_Story:_ As a developer, I want a light client so that the bundle does not carry a second normalized cache duplicating TanStack Query.

Set up the provider, a typed request function, and sensible defaults for staleness and retries. Not Apollo — its cache duplicates TanStack Query and adds roughly 40 kB.

_Acceptance criteria:_

- A client component can run a typed query
- Provider is mounted once at the root
- Errors surface to the nearest error boundary
- No Apollo dependency present

**M3.8 — React cache() wrapper and the server read path** · 1h

_Story:_ As a developer, I want server components to read through services directly so that a server-rendered page does not pay to serialize a GraphQL round trip to itself.

Wrap read-side service functions in React `cache()`, request-scoped so there is no staleness risk. This task also fixes the access boundary for the project, so write it down rather than leaving it to be inferred: server components read through `cache()`-wrapped services; everything the browser initiates — every mutation, and every read that happens without a navigation — goes through GraphQL. Services are the real authorization boundary and both paths end there, so a permission enforced once holds for both. Two transports, one set of rules.

_Acceptance criteria:_

- A layout and page requesting the same workspace hit Postgres once
- Cache does not persist across requests
- Mutations are never wrapped, and never take the server read path
- The boundary is documented in claude-docs with an example of each path
- Every service used by a server component enforces authorization itself, not relying on the caller
- A test proves the same denial occurs through both paths for one representative service

**M3.9 — Lint rules enforcing the access boundary** · 1h

_Story:_ As a reviewer, I want the two access paths enforced mechanically so that the boundary does not erode one convenient import at a time.

Extend the lint restrictions so `src/graphql/**` cannot import the database client or the repository directly, and neither can `src/app/**` — server components reach services and nothing below them. Combined with M1.17, this leaves services as the only route to the database from anywhere.

_Acceptance criteria:_

- A resolver importing the client or repository fails lint
- A server component importing the client or repository fails lint
- Services remain importable from both
- Client components cannot import services at all
- Rules run in pr-gate

**M3.10 — me query, User type and field-level auth scope** · 2h

_Story:_ As a user, I want my own profile available to the client so that the shell can render my identity and memberships.

Add the `me` query and `User` type. Apply a Pothos auth scope to `User.email` as the second check behind the service layer.

_Acceptance criteria:_

- me returns the signed-in user
- Unauthenticated me is rejected
- Another user's email is not exposed
- Memberships resolve through a loader

## M4 — Compendium data layer

_8 tasks · 13 hours_

**Sequencing**

- M4.1 through M4.5 block the compendium service in M5.
- M4.6 blocks M4.7, which blocks the duplicate warning in M5.9. Hand-entering a large compendium without duplicate detection is how you end up with three spellings of mugwort.
- M4.8 (categoriesByIngredient loader) needs the schema from M4.1 and the builder from M3.2, which is why it sits here rather than in the GraphQL milestone.
- Nothing here is workspace-scoped, so it does not wait on M6.

### Schema and seed

**M4.1 — Ingredients schema with both partial unique indexes** · 2h

_Story:_ As a user, I want one ingredient table covering the shared reference and my own additions so that spells point at a single kind of thing.

Add `ingredients` with nullable workspaceId, name, folkNames[], form, description, element, planet, zodiac, deities[], color, safetyNotes, substitutes[] and audit. Two partial unique indexes: global on lower(name) where workspace_id is null, and per-workspace on (workspace_id, lower(name)).

_Acceptance criteria:_

- Global uniqueness enforced only among compendium entries
- Two workspaces may each hold a local ingredient of the same name
- Both indexes carry WHERE deleted_at IS NULL
- form and element accept only the documented value sets

**M4.2 — Categories schema with the group field** · 1h

_Story:_ As a user on a phone, I want categories grouped so that selecting from 52 chips is manageable.

Add `categories` with id, name, slug, color, description, group and audit. Global only, admin-curated.

_Acceptance criteria:_

- Slug unique among non-deleted rows
- group is required
- No workspace scoping on this table

**M4.3 — Seed all 52 categories across 8 groups** · 2h

_Story:_ As a user, I want a rich category vocabulary on day one so that I am not building the taxonomy myself before I can use the app.

Seed every category from §6 with name, slug, colour drawn from its group token, description and group.

_Acceptance criteria:_

- All 52 present, matching §6 exactly
- Each group has its 8-group colour applied
- Every category has a non-empty description
- Reseeding does not duplicate rows

**M4.4 — ingredient_categories join table** · 1h

_Story 22 — As a workspace member, I want ingredients to carry several categories, so that I can find things that are both protective and cleansing._

Join table with audit columns and indexes supporting lookup in both directions.

_Acceptance criteria:_

- Composite key prevents duplicate assignment
- Indexed for both ingredient-to-category and category-to-ingredient
- Carries the audit spread

**M4.5 — Zod schemas for ingredient and category** · 2h

_Story:_ As a developer, I want one validation definition shared by client and server so that the two cannot disagree about what is valid.

Write Zod schemas covering both models, exported for form validation and service-level parsing. Only `name` is required on an ingredient.

_Acceptance criteria:_

- Same schema imported by form and service
- Only name is required; a stub ingredient validates
- Enum fields reject values outside the documented sets
- Unit tests cover valid and invalid cases

### Duplicate detection

**M4.6 — Enable pg_trgm and add the gin index** · 1h

_Story 16 precondition — As a developer, I want trigram matching available in the database, so that near-duplicate names can be detected before they multiply._

Migration enabling the extension and creating the gin index on ingredient name.

_Acceptance criteria:_

- Extension enabled on local and Neon
- Index created and used by the planner
- Migration is idempotent

**M4.7 — Fuzzy duplicate service** · 2h

_Story 16 — As a workspace member, I want to be warned when a name resembles something that already exists, so that I don't end up with three spellings of mugwort._

Return compendium and in-workspace matches above roughly 0.4 similarity on name or any folkNames element. Non-blocking by design.

_Acceptance criteria:_

- Near-misses above threshold are returned
- Below-threshold names return nothing
- Folk names are matched, not only the primary name
- Results span compendium and current workspace only

### Batching

**M4.8 — DataLoader base plus categoriesByIngredient** · 2h

_Story:_ As an operator, I want related data batched so that a 50-ingredient page does not fire 101 queries and spend compute on nothing.

Implement the loader factory and `categoriesByIngredient`. Test by asserting query count, not just correctness.

_Acceptance criteria:_

- A 50-ingredient fetch with categories issues a bounded number of queries
- Test asserts query count explicitly
- Loaders are per-request
- Batching preserves result ordering

## M5 — Admin curation tool

_10 tasks · 16 hours_

**Sequencing**

- This milestone exists to give you a manual data-entry and testing surface early. Once it closes you can populate the compendium by hand instead of editing seed files.
- Admin uses the same GraphQL endpoint, context and session handling as every other page. No server actions, no bespoke route handlers.
- M5.8 and M5.9 (IngredientForm) are reused by the modals in M8. Build the form standalone and wrap it later, rather than building it inside a modal.
- Depends on M2.3, all of M3 and all of M4. Depends on nothing in M6 or later.

### Compendium service

**M5.1 — Acceptance test scaffold for stories 17–18** · 1h

_Stories 17–18 — As a developer, I want the admin stories expressed as failing tests before implementation, so that the tool everything else is entered through is verified as it is built._

Create `tests/acceptance/07-admin.test.ts` with failing tests naming stories 17 and 18. Landing this first means the admin tool is verified as it is built, which matters more than usual here because everything downstream will be entered through it.

_Acceptance criteria:_

- Two failing tests, one per story
- Each names its story number and text
- make test-stories reports them

**M5.2 — Compendium service with admin-only writes** · 2h

_Story 17 — As a workspace member, I want to be prevented from editing compendium entries, so that shared reference data stays trustworthy for everyone._

Read path open to every signed-in user; write path restricted to `users.role = admin`. Authorization lives here, not in resolvers, and the tests confirm the mutation surface offers no bypass on update or delete.

_Acceptance criteria:_

- Any signed-in user can read the compendium
- A non-admin update is rejected with Forbidden
- A non-admin delete is rejected with Forbidden
- An admin write succeeds and stamps updated_by
- Story 17 acceptance test passes

**M5.3 — Soft-delete a compendium entry and prove the name can be reused** · 1h

_Story 25 — As a workspace member, I want deletions to be recoverable, so that a mistake costs a request for help rather than my data._

Admin soft delete stamping deletedAt and deletedBy, plus the test that proves the partial unique index from M4.1 allows re-adding the same name afterwards. Separate from M5.2 because it exercises the index behaviour rather than the authorization rule — without the WHERE clause, deleting an entry would permanently reserve its name.

_Acceptance criteria:_

- Deleted ingredient vanishes from all finders
- Re-adding the same name succeeds
- deletedBy records who deleted it
- Row is still present in the table

### Admin surface

**M5.4 — Admin route guard and layout** · 1h

_Story 18 — As a site admin, I want an admin area only I can reach, so that I can curate shared data without exposing the surface to anyone else._

`/admin` layout asserting `users.role = admin`. A signed-in non-admin gets a clear 'not authorized' page, not a 404 — `/admin` is a guessable path on every site ever built, so pretending it does not exist buys no secrecy and only makes the app look broken to someone who typed it out of curiosity. This differs from `/coven/[slug]` in M6.11, where the existence of a workspace is genuinely private and 404 is the right answer. Admin follows the same access boundary as the rest of the site: server-rendered reads through services, every mutation through GraphQL.

_Acceptance criteria:_

- Admins see the layout
- Signed-in non-admins get a styled not-authorized page explaining they lack rights
- Signed-out visitors are sent to sign-in with the return path preserved
- Guard is server-side, not a client redirect
- The page does not name who the admins are or offer a way to request access
- Admin mutations go through /api/graphql like every other mutation
- Nav entry appears only for admins

**M5.5 — Admin compendium CRUD** · 2h

_Story 18 — As a site admin, I want to add, edit and soft-delete compendium entries, so that the shared reference can grow without a deploy._

`/admin/compendium` reusing IngredientForm in editable mode, with create, edit and soft delete over the global entries. Reads and writes go through GraphQL queries and mutations.

_Acceptance criteria:_

- Admin can create, edit and soft-delete compendium entries
- Audit columns record the admin
- Soft-deleted entries vanish from the public compendium
- Fuzzy duplicate warning applies here too

**M5.6 — Admin categories CRUD** · 2h

_Story 18 — As a site admin, I want to add, edit and soft-delete categories, so that the taxonomy can change without a migration._

`/admin/categories` with create, edit and soft delete, including the group assignment that drives chip grouping. Reads and writes go through GraphQL queries and mutations.

_Acceptance criteria:_

- Admin can manage categories including their group
- Slug uniqueness enforced with a readable error
- Deleting a category in use is handled explicitly, not by cascade surprise
- Colour picks from the group palette

**M5.7 — Gate admin mutations by role** · 2h

_Stories 18 and 19 — As a workspace owner, I want admin rights to cover shared reference data and nothing else, so that an admin cannot reach into my workspace._

Apply the role check at the service layer for every admin mutation, with tests for each entry point, and add a Pothos auth scope on the admin mutation fields as the second check — the same belt-and-braces pattern used for `User.email`.

_Acceptance criteria:_

- Every admin mutation rejects non-admins at the service layer
- Pothos auth scope rejects them at the schema layer independently
- Rejection is Forbidden, not a silent no-op
- Tests cover each mutation individually
- No admin capability outside compendium and categories

**M5.8 — Approve a user for workspace creation** · 1h

_Story:_ As a site admin, I want to approve someone who has no invitation, so that a person starting a coven of their own can get in without knowing an existing user.

Admin control setting `canCreateWorkspace` on a user, with the change audited. This is the approval route; the invitation route is M7.5. Revoking does not touch workspaces the person already created — they remain owner of those, since the flag governs creating, not keeping.

_Acceptance criteria:_

- Admin can grant and revoke the flag
- The change records who made it and when
- Revoking leaves existing workspaces and their ownership untouched
- Users awaiting approval are findable, so an admin can act without being sent an id
- A non-admin cannot reach the control or the mutation

### Entry form

**M5.9 — IngredientForm — fields and inline validation** · 2h

_Stories 29 and 31 — As a workspace member, I want to save an ingredient with only a name and see errors beside the field that caused them, so that I can capture something quickly and fix mistakes without hunting._

Form covering every ingredient property, validating with the shared Zod schema, showing errors inline next to their field.

_Acceptance criteria:_

- Saving with only a name succeeds
- Errors appear beside the offending field
- Errors are announced to assistive technology
- Array fields (folkNames, deities, substitutes) are editable

**M5.10 — IngredientForm — Did you mean warning** · 2h

_Story 16 — As a workspace member, I want a warning when the name I'm typing resembles an existing one, so that I can reuse an entry instead of duplicating it._

Debounced fuzzy lookup on the name field rendering a non-blocking suggestion with a link to the match, alongside a Create Anyway action.

_Acceptance criteria:_

- Warning appears for a near-match and does not block submission
- Link navigates to the suggested ingredient
- Create Anyway proceeds
- No warning below threshold
- Story 16 acceptance test passes

## M6 — Workspaces and membership

_18 tasks · 32 hours_

**Sequencing**

- M6.2 (schema) blocks everything else in this milestone.
- M6.3 (assertMembership) blocks every workspace-scoped service from M8 onward. Land it before any workspace feature work.
- M6.4 and M6.5 should follow M6.3 immediately, while the authorization model is fresh. RLS written months later tends not to match the service layer.
- M6.3, M6.4 and M6.5 are three different things: the application check, the database check, and the proof that the second works without the first. None is redundant.
- M6.11 and M6.12 land before M6.13 because the members page composes both.
- M6.8 must return a reason, not a bare refusal, or M6.16 cannot offer the right remedy.

### Schema and authorization

**M6.1 — Acceptance test scaffold for stories 3–13** · 2h

_Stories 3–13 — As a developer, I want the workspace stories expressed as failing tests before implementation, so that authorization is verified against the specification._

Extend `01-accounts.test.ts` with failing tests for stories 3 through 13, each naming its story.

_Acceptance criteria:_

- Eleven failing tests, one per story
- Each names its story number and text
- make test-stories reports them

**M6.2 — Workspaces and workspace_members schema** · 2h

_Story:_ As a user, I want workspaces with members so that a coven or household can share one inventory.

Add `workspaces` (id, name, slug, audit) and `workspace_members` (workspaceId, userId, role, joinedAt, audit) with a composite primary key. Unique slug on a partial index. No kind column — every workspace behaves identically.

_Acceptance criteria:_

- Migration applies cleanly
- Slug is unique among non-deleted workspaces
- Composite primary key on the membership pair
- No column distinguishes one class of workspace from another
- Both tables carry the full audit spread

**M6.3 — assertMembership and the role hierarchy** · 2h

_Story 12 — As a viewer, I want to read everything in a workspace but change nothing, so that I can be included without putting shared records at risk._

Implement `assertMembership(userId, workspaceId, minRole)` with the ordering viewer < member < owner, called inside `withAudit` for every workspace-scoped operation. Unit test every role and threshold combination.

_Acceptance criteria:_

- Every role/threshold pair is covered by a test
- A non-member is rejected with Forbidden
- The check runs inside the same transaction as the write
- No service bypasses it

**M6.4 — Row-Level Security policies for workspace-scoped tables** · 2h

_Story:_ As an owner, I want the database itself to enforce workspace boundaries so that an application bug cannot leak my grimoire.

Migration adding Row-Level Security policies to every workspace-scoped table. RLS is a Postgres feature that attaches a rule to a table so the database itself filters which rows a query may read or change — enforcement below the application, so a bug in a service cannot leak another workspace's data. The policies need to know who is asking, which comes from the GUC set in M1.17. A GUC is Postgres's name for a runtime setting; `SET LOCAL app.current_user_id = '<uuid>'` defines a custom one scoped to the transaction, and a policy reads it back with `current_setting('app.current_user_id')`. Transaction-scoped matters: it cannot leak to the next request sharing a pooled connection.

_Acceptance criteria:_

- RLS enabled on each workspace-scoped table
- Policies read the user from current_setting('app.current_user_id'), not from anywhere else
- Migrations and seeds still run under the policies
- The setting does not survive past the transaction that set it
- Policy names follow one convention
- RLS and GUC are explained once in claude-docs so the next reader need not look them up

**M6.5 — Prove RLS holds with the service check disabled** · 1h

_Story 19 — As a workspace owner, I want the database to block cross-workspace access even if the application forgets to, so that one missed check in a service is not a data breach._

M6.3 is the application-layer check and M6.4 is the database-layer one. They look redundant and that is the point: this task proves the second works without the first. Stub out `assertMembership` for the duration of one test, attempt a cross-workspace read, and assert the database refuses it. Without this test the RLS policies are decoration — every passing test would pass on the service check alone, and a broken policy would go unnoticed for months.

_Acceptance criteria:_

- Test passes only because RLS blocks the read
- Stub is scoped to the single test and cannot leak into others
- The test fails if RLS is disabled on the table, proving it tests what it claims
- Comment explains why the bypass is deliberate

**M6.6 — Cross-boundary denial tests for non-members and site admins** · 2h

_Story 19 — As a workspace owner, I want both outsiders and site admins refused access to my workspace, so that neither a stranger nor a curator can read what my coven records._

Automated tests in the `db` suite, not a manual pass. Two actors, one harness: D, a member of an unrelated workspace, and E, a site admin belonging to no workspace. Assert both are refused W's ingredients and grimoire — by direct id, not merely absent from list results, since filtering a list is easy to get right while leaving a direct fetch wide open. Writes must throw Forbidden rather than silently no-op.

_Acceptance criteria:_

- Direct-id reads rejected for both D and E, not just filtered from lists
- Writes throw Forbidden rather than returning success
- Covers ingredients and grimoire
- E's admin capabilities over the compendium remain intact
- Failure messages do not reveal whether the record exists
- Story 19 acceptance test passes

### Workspace UI

**M6.7 — Create a workspace** · 2h

_Story 3 — As a signed-in user, I want to create a workspace, so that my coven or household has a shared place to work._

Service and mutation creating a workspace with the creator as owner, gated on canCreateWorkspace or the admin role. Slug generated from the name with collision handling. The gate lives in the service, so it holds for the GraphQL mutation and any future path equally.

_Acceptance criteria:_

- Creator is owner on creation
- A user without creation rights is rejected with Forbidden
- An admin can create without holding the flag
- Slug collisions resolve deterministically
- A user with rights may own more than one workspace
- Creation rights are not consumed by creating a workspace unless the invite said single-use
- Story 3 acceptance test passes

**M6.8 — Last-owner guard on demotion and removal** · 1h

_Story 11 — As a workspace owner, I want to be blocked from removing the last owner, so that a workspace cannot be orphaned by one careless click._

Reject any demotion or removal that would leave a workspace with zero owners, at the service layer. The rejection must carry enough information for the interface to offer the remedy — which member could be promoted, or whether the owner is the only member and should delete the workspace instead. A bare Forbidden here is what makes M6.16 impossible to build well.

_Acceptance criteria:_

- Demoting the only owner is rejected
- Removing the only owner is rejected
- The owner leaving voluntarily is also rejected
- The error distinguishes 'other members exist, promote one' from 'you are the only member'
- Two owners can each be demoted down to one

**M6.9 — WorkspaceSwitcher component** · 2h

_Story 8 — As a member of several workspaces, I want to switch between them without losing my place, so that moving between my own notes and a coven's is quick._

Component listing the user's memberships and navigating on select. Workspace comes from the URL, never session state — two tabs must be able to disagree safely.

_Acceptance criteria:_

- Lists every workspace the user belongs to
- Selecting navigates to the equivalent route in the new workspace
- Two tabs in different workspaces do not interfere
- Keyboard operable, axe clean

**M6.10 — Coven layout, slug resolution and non-member 404** · 2h

_Story:_ As a user, I want a workspace-scoped layout so that every page below it knows which workspace it is in without guessing.

`/coven/[slug]` layout resolving the slug to a workspace and asserting membership. Non-members get 404, not 403, so workspace existence is not disclosed — the opposite call to `/admin` in M5.5, and for a reason: a slug is a guess about someone's private data, whereas `/admin` is a fixed path everyone already knows.

_Acceptance criteria:_

- Members see the layout
- Non-members receive 404
- Unknown slug also receives 404, indistinguishable from the above
- Workspace is read from the URL segment only

**M6.11 — membersByWorkspace loader** · 2h

_Story:_ As an operator, I want membership lookups batched so that a members page does not issue one query per row.

Add the `membersByWorkspace` loader with a query-count assertion. Sits here rather than in the GraphQL foundation because it cannot exist before workspaces do.

_Acceptance criteria:_

- Loader batches correctly across a multi-workspace request
- Query-count assertion in place
- Loader is per-request, never module-level
- Ordering of batched results is preserved

**M6.12 — MemberList component** · 2h

_Story 9 — As a workspace member, I want each member shown with their role and joining date, so that the membership list is readable at a glance._

Presentational component showing display name, role and joined date, with an action slot supplied by the page. Component tests using role and label queries.

_Acceptance criteria:_

- Renders all three roles distinctly
- Action slot is absent when no actions are passed
- Own row is identifiable
- No test ids for anything a user can see

**M6.13 — Members page with owner-gated controls** · 2h

_Story 9 — As a workspace member, I want to see who is in the workspace and their roles, so that I know who can read what I write._

`/coven/[slug]/members` listing members and roles. Role controls and the invite action are rendered only for owners. This page is the only route to ownership: invitations cannot grant it, so an owner promotes an existing member here, after they have signed up and can be recognised. Composes the MemberList component and reads through the membersByWorkspace loader, both of which land immediately before it.

_Acceptance criteria:_

- All members can view the list
- Role controls hidden for non-owners and rejected server-side too
- An owner can promote an existing member to owner from this page
- Promotion targets an existing member only, never a pending invitation
- axe scan passes
- Every workspace shows the page, including one with a single member

**M6.14 — Delete a workspace** · 2h

_Story:_ As an owner, I want to delete a workspace I no longer use so that abandoned covens do not clutter my switcher forever.

Owner-only soft delete, with a confirmation naming the workspace and stating what becomes inaccessible — its ingredients and its grimoire. Members lose access immediately. Deletion is soft, so nothing is destroyed and a workspace deleted in error can be restored by hand.

_Acceptance criteria:_

- Only an owner can delete
- Confirmation names the workspace and states what is lost
- Deletion is soft; nothing is destroyed
- All members lose access immediately, including other owners
- Deleted workspaces disappear from the switcher

**M6.15 — Remove member and leave workspace** · 1h

_Story 10 — As a workspace owner, I want to remove a member, and as a member I want to leave, so that membership reflects who is actually involved._

Owner-initiated removal and self-initiated leave, both soft, both subject to the last-owner guard. This task covers the ordinary cases; the blocked last-owner case and its remedy are M6.16.

_Acceptance criteria:_

- Owner can remove a member
- A member can leave without owner action
- Last-owner guard applies to both paths
- Removed user immediately loses access

**M6.16 — Guided exit for the last owner** · 2h

_Story 10 — As the only owner of a workspace I no longer want, I want to be shown how to hand it over or close it, so that I am not left believing I am stuck in it forever._

The last-owner guard in M6.8 is correct and will read as a bug unless the refusal explains itself. Keep the Leave control visible and enabled rather than hidden or greyed out — a disabled control with no explanation is exactly what makes someone conclude they are trapped. On click, offer both ways out, never only one. If other members exist: promote one of them and leave, with a picker and a single action that does both; or delete the workspace entirely, since an owner may simply be done with it and should not have to install a successor to get there. If the owner is the only member, promotion is impossible and deletion is the whole answer. Deletion always routes into the M6.14 confirmation, which already names what becomes inaccessible — that confirmation is what stops 'delete instead' from being a foot-gun when other people's records are in there. Also surface it before it is urgent: the members page shows a quiet note whenever a workspace has exactly one owner, saying that if that person loses access nobody can manage members.

_Acceptance criteria:_

- Leave stays visible and enabled; the explanation comes on click, not as a disabled tooltip
- Both remedies are offered together: hand it over, or delete it entirely
- With other members present, the dialog lists them and offers promote-then-leave as one action
- Deletion is offered in both branches, not only when the owner is the only member
- Deletion routes into the M6.14 confirmation rather than deleting from this dialog
- The deletion option states that other members lose access, before it is chosen
- Neither path can leave a workspace ownerless, and the guard still refuses if the UI is bypassed
- The members page notes when a workspace has exactly one owner
- Wording avoids blame and states the remedies first
- Both paths are keyboard operable and axe clean

**M6.17 — Viewer read-only enforcement across services** · 2h

_Story 12 — As a workspace owner, I want viewers to be unable to change shared records, so that I can share our ingredient records without risking them._

Apply the `member` minimum to every mutating workspace service. With notes deferred to v2 there is no exception: a viewer reads everything in the workspace and writes nothing.

_Acceptance criteria:_

- Viewer writes to ingredients and grimoire are rejected
- Viewer reads succeed everywhere within the workspace
- No mutating service accepts a viewer
- Story 12 acceptance test passes

**M6.18 — Last-edited-by display on ingredient rows** · 1h

_Story 13 — As a workspace member, I want to see who last edited an ingredient and when, so that I know who to ask about a change._

Surface `updatedBy` and `updatedAt` on the row, resolved to display name, formatted relative with an absolute tooltip.

_Acceptance criteria:_

- Row shows who and when
- Display name resolves without an N+1 query
- Absolute timestamp available on hover and to screen readers
- Story 13 acceptance test passes

## M7 — Invitations

_7 tasks · 12 hours_

**Sequencing**

- Depends on M6 membership existing.
- M7.2 (token service) blocks M7.3 through M7.7.
- M7.6 (revoke) lands before M7.7 (rejection), because the rejection path cannot honour a revoked state that does not exist yet.
- Invitations grant viewer or member only. Ownership is granted afterwards by an existing owner on the members page (M6.13), so identity is confirmed before rights are.

### Invitations

**M7.1 — workspace_invitations schema** · 1h

_Story:_ As an owner, I want invitations stored safely so that a leaked database row cannot be redeemed.

Add the table with id, workspaceId, email, role, tokenHash, expiresAt, acceptedAt, acceptedBy, revokedAt and audit columns. Only the hash is stored. The role column accepts `viewer` or `member` only — owner is deliberately not invitable, and the constraint lives in the database so no future code path can widen it by accident.

_Acceptance criteria:_

- No column holds the plaintext token
- A check constraint rejects an invitation with role owner
- Expiry has a sensible default
- Indexed for lookup by token hash
- Full audit spread present

**M7.2 — Token generation and hash-only storage** · 2h

_Story 4 — As a workspace owner, I want an invitation link shown once and stored only as a hash, so that a leaked database row cannot be redeemed._

Service generating an invitation token, storing only its hash, and returning the plaintext exactly once to the caller. Generate it with a CSPRNG — a cryptographically secure pseudorandom number generator, meaning `crypto.randomBytes()` from Node's crypto module, never `Math.random()`. The difference matters: `Math.random()` is a fast, predictable generator, so anyone who collects a few tokens can work out the internal state and compute the next ones. A CSPRNG draws from the operating system's entropy pool and gives no such foothold. Unit tests cover generation, hashing and single-return.

_Acceptance criteria:_

- Token is generated with crypto.randomBytes(), not Math.random()
- Token carries at least 128 bits of entropy
- Only the hash reaches the database
- Plaintext is returned once and is never retrievable afterwards
- Holding one token gives no way to guess another
- CSPRNG is explained once in claude-docs so the next reader need not look it up

**M7.3 — createInvitation mutation returning the URL once** · 2h

_Story 4 — As a workspace owner, I want to generate an invitation link with a chosen role, so that I control what a new member can do before they arrive._

Owner-only mutation returning `InvitationResult` with the invitation and the full URL. The URL appears in that response body and nowhere else. The invitable roles are viewer and member; ownership cannot be granted by link. Someone holding a URL has proved only that they received it, and an invitation can be forwarded, so ownership is granted afterwards by an existing owner on the members page, once there is an identifiable account to point at.

_Acceptance criteria:_

- Only owners can call it
- Role must be viewer or member; owner is rejected with a clear error
- Role is chosen at creation and honoured on acceptance
- URL is absent from any subsequent query
- Any workspace can be invited into, including a user's first one
- Rejection happens at the service, not only in the schema enum

**M7.4 — InviteDialog component** · 2h

_Story 4 — As a workspace owner, I want to copy the invitation link and be told plainly that it will not be shown again, so that I do not lose it silently._

Dialog with role selection, a copy-to-clipboard field, and an unmistakable warning that this is the only time the link is shown. The role selector offers viewer and member only, with a line explaining that ownership is granted after the person joins. Component tests for copy behaviour and the warning.

_Acceptance criteria:_

- Warning is present and visible before the link is dismissed
- Role selector offers viewer and member, and never owner
- Explains in one line where ownership is granted instead
- Copy control works and confirms success
- Link is not re-rendered after the dialog closes
- Focus trap, Escape to close, focus restored, axe clean

**M7.5 — Invitation acceptance page** · 2h

_Story 6 — As an invited person, I want to accept an invitation and land in the workspace, so that joining takes one click and a sign-in._

`/invite/[token]` — reachable unauthenticated, prompting sign-in first if needed, then adding membership at the invited role and redirecting into the workspace. Accepting also sets `canCreateWorkspace`: someone vouched for by an existing member is an established user, and this is the main route through the invite gate.

_Acceptance criteria:_

- Signed-out users can start the flow and complete it after sign-in
- Membership is created at the invited role
- Accepting sets canCreateWorkspace, and the change is audited
- A viewer invitation grants creation rights too — the gate is about the site, not the role
- A tampered token claiming owner is rejected, not honoured
- Redirect lands in the workspace ingredients page
- acceptedAt and acceptedBy are stamped

**M7.6 — Revoke a pending invitation** · 1h

_Story 5 — As a workspace owner, I want to revoke a pending invitation, so that I can undo an invite sent in error._

The owner-facing half: an owner-only mutation stamping revokedAt, plus the list of pending invitations on the members page so there is something to revoke from. This task creates the revoked state; M7.7 is what honours it when someone tries to redeem the link. Already-accepted invitations cannot be revoked — removing that person is a membership action, not an invitation one.

_Acceptance criteria:_

- Owner can revoke a pending invitation
- Revoking an already-accepted invitation is rejected, with a pointer to member removal
- Non-owners cannot revoke
- Pending invitations are listed on the members page with their role and expiry
- revokedAt is stamped and the row is retained for audit

**M7.7 — Reject expired, revoked and reused tokens** · 2h

_Story 7 — As a workspace owner, I want expired, revoked and already-used links rejected, so that an old link in someone's inbox is not a way in._

The redeemer-facing half: everything that can make a link unusable, checked in one place on the acceptance path. Three separate conditions, three distinct messages — expired (the clock ran out), revoked (the owner withdrew it, the state M7.6 creates), and already accepted (someone used it). One generic 'invalid link' would leave the recipient unable to tell whether to ask for a new invitation or check whether they are already a member. Messages must not name the workspace, since the reader is by definition not a member of it.

_Acceptance criteria:_

- Expired token rejected, with a message saying so
- Revoked token rejected, distinctly from expired
- Already-accepted token rejected, distinctly from both
- A token that is both expired and revoked reports one reason, deterministically
- No message reveals the workspace name to a non-member
- Story 7 acceptance test passes

## M8 — Compendium browsing and local ingredients

_19 tasks · 35 hours_

**Sequencing**

- Depends on M4 schema, M5 services and M3 GraphQL.
- M8.4 (filterIngredients) blocks the search UI in M8.9 through M8.12.
- Build IngredientSearch composable with an action slot the first time.
- M8.7 (revalidateTag on admin mutations) closes the loop on M5: it cannot land until caching exists in M8.6.
- IngredientSearch is reused by the workspace ingredients page in M9 and the spell builder in M10.

### Services and search

**M8.1 — Acceptance test scaffold for stories 14–16** · 2h

_Stories 14–16 — As a developer, I want the compendium browsing stories expressed as failing tests before implementation, so that done is measured against the specification._

Create `tests/acceptance/02-compendium.test.ts` with failing tests naming stories 14 through 16. Stories 17 and 18 are covered by the admin scaffold in M4; story 19 by the workspace isolation tests in M5.

_Acceptance criteria:_

- Three failing tests, one per story
- Each names its story number and text
- No overlap with the admin or workspace scaffolds
- make test-stories reports them

**M8.2 — Workspace-local ingredient service** · 2h

_Story 15 — As a workspace member, I want to create an ingredient local to my workspace when the compendium lacks it, so that my practice is not limited to someone else's list._

Create, update and read local ingredients scoped by workspaceId, writable by owners and members. Invisible to every other workspace.

_Acceptance criteria:_

- Owners and members can create; viewers cannot
- A local ingredient is unreadable from another workspace, including by direct id
- No path promotes a local ingredient to global
- Story 15 acceptance test passes

**M8.3 — Local-beats-compendium name resolution** · 2h

_Story:_ As a user who disagrees with an admin's correspondences, I want my own version to win in my workspace so that curation does not override my practice.

When a workspace-local ingredient shares a name with a compendium entry, the local entry wins in that workspace's search results and is badged as local.

_Acceptance criteria:_

- Local entry appears and compendium entry is suppressed for that name
- Other workspaces still see the compendium entry
- The badge distinguishes the two
- Two locals in one workspace may not share a name

**M8.4 — filterIngredients() library function** · 2h

_Story 21 — As a workspace member, I want to search by name or folk name, so that I can find Devil's Shoestring without remembering it is honeysuckle root._

Pure function handling name and folk-name matching, AND versus OR across categories, case and accent insensitivity, and empty query returning all. Heaviest unit coverage in the project.

_Acceptance criteria:_

- Matches on folk names as well as names
- AND is the default across categories; OR is opt-in
- Accent and case insensitive
- Empty query returns everything
- No database access — pure function

**M8.5 — compendium and ingredient GraphQL queries** · 2h

_Story 14 — As a workspace member, I want to browse the compendium, so that I can add shared entries to my own ingredients._

Add both queries with search, categoryIds and form arguments, delegating to services. Categories resolve through the DataLoader.

_Acceptance criteria:_

- Both queries return correct results for each argument combination
- Resolvers contain no database access
- Category resolution is batched
- List query paginates through the M3.6 helper, with its default and maximum

**M8.6 — Cache the compendium with tag invalidation** · 2h

_Story:_ As an operator, I want the compendium served from cache so that the most-read data on the site does not hit Postgres on every page.

Wrap the compendium and category reads in `unstable_cache` with the `compendium` tag and an hour's revalidation. Viewer-independent data only — never cache anything workspace-scoped.

_Acceptance criteria:_

- Repeat reads do not hit Postgres
- Only viewer-independent data is cached
- Tag name is a shared constant, not a literal
- Cache is bypassed correctly in tests

**M8.7 — Fire revalidateTag on admin mutations** · 1h

_Story:_ As a user, I want compendium edits to appear promptly so that the cache does not serve me an admin's outdated correspondences for an hour.

Call `revalidateTag('compendium')` after every admin mutation touching ingredients or categories.

_Acceptance criteria:_

- An admin edit is visible on the next page load
- Tag constant is shared, not a string literal per call site
- Every admin mutation path is covered

**M8.8 — createWorkspaceIngredient and updateIngredient mutations** · 2h

_Stories 15 and 34 — As a workspace member, I want my edits saved and reflected in the list immediately, so that I can trust what I am looking at._

Both mutations delegating to services, with Zod validation and audit stamping. Return the updated entity for cache reconciliation.

_Acceptance criteria:_

- Validation errors return field-level detail
- Audit columns stamped from the session
- Returned entity lets the client update without a refetch
- Viewers are rejected

### Search UI

**M8.9 — Acceptance test scaffold for stories 28–34** · 2h

_Stories 28–34 — As a developer, I want the add and edit modal stories expressed as failing tests before implementation, so that the form's behaviour is specified rather than discovered._

Create `tests/acceptance/04-modals.test.tsx` with failing tests naming each of stories 28 through 34.

_Acceptance criteria:_

- Seven failing tests, one per story
- Each names its story number and text
- make test-stories reports them

**M8.10 — IngredientSearch — debounced text matching** · 2h

_Story 21 — As a workspace member, I want to type a name or folk name and see the list narrow, so that finding something is faster than scrolling._

The search component's text input, debounced, matching name and folk names via `filterIngredients()`. Shared later by compendium, workspace ingredients and spell builder.

_Acceptance criteria:_

- Typing filters results after the debounce, not on every keystroke
- Folk names match
- Debounce tested with fake timers
- Clear control resets the query

**M8.11 — IngredientSearch — grouped category chips** · 2h

_Stories 22 and 30 — As a workspace member, I want to filter by several categories from grouped chips, so that I can narrow 52 categories on a phone without scrolling forever._

Multi-select chips grouped by the category `group` field, collapsible by group so 52 chips are usable on a phone. AND semantics by default.

_Acceptance criteria:_

- Chips are grouped and each group collapses
- Multiple selections combine with AND
- Selected state is visually and programmatically distinguishable
- Usable at a 375px viewport, axe clean

**M8.12 — IngredientSearch — OR toggle** · 1h

_Story 22 — As a workspace member, I want to combine categories with 'any' as well as 'all', so that I can search broadly when nothing matches every term._

Toggle switching category combination between AND and OR, with a label that makes the current mode obvious.

_Acceptance criteria:_

- Toggle switches modes and results update
- Current mode is announced to assistive technology
- Mode persists in URL state

**M8.13 — IngredientSearch — secondary filters and URL state** · 2h

_Story 27 — As a workspace member, I want to filter to only our own ingredients or only compendium ones, so that I can review what we have added ourselves._

Form, element and in-stock-only filters, plus local-versus-compendium. All filter state lives in the URL query string so a filtered view is shareable and survives reload.

_Acceptance criteria:_

- Every filter is reflected in the URL
- Reloading restores the exact view
- Back button steps through filter changes
- Filters combine correctly with search text

**M8.14 — IngredientCard with safety and low-stock badges** · 2h

_Stories 23 and 53 — As a workspace member, I want stock and safety flagged on the card, so that I notice a toxic ingredient or an empty jar without opening it._

Card component using the `badge()` mixin, showing safety warnings and stock state. Badges convey meaning by text and shape, not colour alone.

_Acceptance criteria:_

- Safety badge appears when safetyNotes is present
- Low and out-of-stock states are distinct
- Meaning does not depend on colour alone
- axe clean, keyboard reachable

### Modals and pages

**M8.15 — IngredientForm — read-only mode for compendium entries** · 1h

_Story 17 — As a workspace member, I want compendium entries shown as read-only with a reason, so that I understand why I cannot edit rather than assuming it is broken._

Render fields read-only for non-admins viewing a compendium entry, with an explanation rather than disabled controls that look broken.

_Acceptance criteria:_

- Non-admin sees read-only fields and a reason
- Admin sees the editable form
- Read-only state is conveyed to assistive technology

**M8.16 — AddIngredientModal** · 2h

_Story 28 — As a workspace member, I want to open the add form from anywhere via the nav, so that recording something does not cost me my place._

Modal wrapper around IngredientForm, reachable from the main nav on any page. Focus trap, Escape to close, focus restored to the trigger. Closing with unsaved input warns first, matching the edit modal in M8.17 — a half-filled new ingredient is as easy to lose as an edit, and losing it to a stray Escape key is worse because there is nothing to go back to.

_Acceptance criteria:_

- Opens from nav on every page
- Focus is trapped while open and restored on close
- Submit payload matches the schema
- axe scan passes with the modal open
- Closing with unsaved input prompts before discarding
- Escape and the close control both route through the same prompt
- Closing an untouched form does not prompt

**M8.17 — EditIngredientModal with dirty-discard warning** · 2h

_Stories 32 and 33 — As a workspace member, I want the edit form pre-filled and a warning before discarding changes, so that I do not lose work by closing a dialog._

Modal pre-populated from the selected ingredient, reachable from the nav picker and from a row. Warn before discarding unsaved edits.

_Acceptance criteria:_

- Fields pre-populate correctly
- Closing with unsaved changes prompts first
- Closing with no changes does not prompt
- Reachable from both entry points
- Story 34: the list reflects the edit immediately on save

**M8.18 — Compendium page** · 2h

_Story 14 — As a workspace member, I want a browsable compendium page, so that I can find shared entries and add them to my ingredients._

`/compendium` composing IngredientSearch with an Add to my ingredients action slot. Read-only for non-admins. Server-rendered with the cached data.

_Acceptance criteria:_

- Search, filters and chips all function
- Add to my ingredients is present for members, absent for viewers
- Page is server-rendered and uses the cached compendium
- axe clean, usable at 375px

**M8.19 — Ingredient detail page shell** · 2h

_Story:_ As a user, I want a page per ingredient so that correspondences have a permanent home I can link to.

`/ingredients/[id]` showing every correspondence field, safety notes and substitutes. Built so a notes section can be added below without restructuring the page, since notes are the first thing planned for v2.

_Acceptance criteria:_

- All properties rendered with sensible empty states
- Works for both compendium and local ingredients
- Local entries are badged
- Empty states read as intentional, not broken

## M9 — Workspace ingredients

_12 tasks · 19 hours_

**Sequencing**

- Depends on M4 ingredients and M6 workspaces existing.
- M9.2 (schema) blocks the rest of the milestone.
- M9.8 (stock badges) depends on the lowStockThreshold column and the unit dimensions added in M9.2.
- Units live in one shared module owning the unit-to-dimension map. M9.2, M9.5 and M9.8 all import it rather than each keeping a list.
- Compendium entries carry no stock. An ingredient only gains a quantity when a workspace adds it, which creates a row in inventory_items scoped to that workspace (M9.2).

### Workspace ingredients

**M9.1 — Acceptance test scaffold for stories 20–27** · 2h

_Stories 20–27 — As a developer, I want the workspace ingredient stories expressed as failing tests before implementation, so that stock behaviour is specified rather than discovered._

Create `tests/acceptance/03-ingredients.test.ts` with failing tests naming each of stories 20 through 27.

_Acceptance criteria:_

- Eight failing tests, one per story
- Each names its story number and text
- make test-stories reports them

**M9.2 — inventory_items schema** · 1h

_Story 20 — As a workspace member, I want our ingredients and quantities recorded, so that I can see everything we hold in one list._

Add the table with workspaceId, ingredientId, quantityOnHand, unit, unitDimension, lowStockThreshold, source, acquiredDate and audit. Unique on (workspaceId, ingredientId) where not deleted. Units cover three dimensions, metric and imperial in each: weight — mg, g, kg, oz, lb; volume — ml, l, tsp, tbsp, fl oz, cup; count — piece, drop, pinch. Store the dimension alongside the unit rather than deriving it at every call site, so a query can filter or group by it and M9.5 has something to check against. One shared module owns the unit-to-dimension map and both the Zod schema and the conversion library import it, so the list cannot drift in two places.

_Acceptance criteria:_

- A workspace cannot hold two stock rows for one ingredient
- Re-adding after soft delete succeeds
- Unit enum covers weight, volume and count, metric and imperial
- unitDimension is stored and always consistent with the unit
- A row whose dimension contradicts its unit cannot be written
- Adding a unit means editing one module, not three
- Audit spread present

**M9.3 — Workspace ingredients service with authorization tests** · 2h

_Story 12 — As a workspace owner, I want members to change stock and viewers only to read it, so that stock records match who is responsible for them._

CRUD service scoped by workspace, going through assertMembership and withAudit. Tests cover each fixture user against each operation.

_Acceptance criteria:_

- Members can add, update and delete stock
- Viewers are rejected on writes and permitted on reads
- D cannot touch W's stock by direct id
- Admin E has no access

**M9.4 — workspace ingredients query and stock mutations** · 2h

_Story 14 — As a workspace member, I want to add a compendium entry to our ingredients, so that I do not re-type what is already described._

Add the `workspaceIngredients` query and `addIngredientToWorkspace` plus stock update mutations, delegating to services with batched ingredient and category resolution. The Ingredient list paginates through the M3.6 helper.

_Acceptance criteria:_

- Query supports search and category filters
- addIngredientToWorkspace is idempotent against an existing row
- Ingredient and category resolution is batched
- Mutations return the updated item
- Ingredient list paginates through the M3.6 helper, not an unbounded fetch

**M9.5 — unitConvert() within a single dimension** · 2h

_Story 24 — As a workspace member, I want quantities compared across units of the same kind, so that a recipe in teaspoons can be checked against a jar measured in millilitres._

Pure function converting only within one dimension: weight to weight, volume to volume. Cross-dimension conversion is refused outright rather than attempted — grams to teaspoons depends on what is being measured, and a wrong answer here silently doubles or halves an ingredient in a working. Count converts to nothing at all; three pinches is not a quantity of millilitres. The refusal is an explicit result the caller must handle, never a null or a best guess.

_Acceptance criteria:_

- Weight to weight and volume to volume convert exactly, to a defined precision
- Weight to volume is refused, in both directions
- Any conversion involving count is refused
- Refusal is a distinguishable result the caller must handle, not null or NaN
- Round-tripping a value returns the original within the defined precision
- No density table exists anywhere in the codebase
- Unit tested across every pair within each dimension, and a sample of refused pairs

**M9.6 — Workspace ingredients page** · 2h

_Story 20 — As a workspace member, I want one page listing everything we hold, so that I do not have to look in two places._

`/coven/[slug]/ingredients` — one page covering both local ingredients and compendium-sourced stock, composing IngredientSearch with an edit/delete action slot.

_Acceptance criteria:_

- Lists local and compendium-sourced entries together
- Search and filters function identically to the compendium page
- Server-rendered shell, no workspace data cached across requests
- axe clean, usable at 375px

**M9.7 — Local versus compendium filter chip** · 1h

_Story 27 — As a workspace member, I want to filter my ingredients by where an entry came from, so that I can review what we added ourselves._

Filter chip distinguishing the two sources, reflected in URL state. This is what makes one page correct rather than two.

_Acceptance criteria:_

- Three states: all, local only, compendium only
- Reflected in the URL
- Local entries are badged in every state
- Story 27 acceptance test passes

**M9.8 — Low and out-of-stock badges with a sensible default threshold** · 1h

_Story 23 — As a workspace member, I want low and empty stock flagged, so that I know what to replace before I start a working._

Compare quantityOnHand against lowStockThreshold and render the appropriate badge, with a filter for low stock. Nobody wants to set a threshold on every one of two hundred jars, so supply one at add time by dimension: 3 for count, 10 g for weight, 15 ml for volume, converted into whatever unit the row uses. A flat number across dimensions would be useless — 5 is a reasonable count of candles and an invisible quantity of dried herb. Write the default onto the row when it is created rather than leaving the column null and applying a constant at read time: it stays visible and editable, and changing the constant later does not silently reinterpret every existing row.

_Acceptance criteria:_

- Low stock triggers at or below the threshold
- Zero renders as out of stock, distinctly from low
- A new row gets a dimension-appropriate default without the member choosing one
- The default is written to the row, not applied at read time
- The threshold is visible and editable on the row
- Setting a threshold of zero disables the warning rather than meaning 'always low'
- Meaning does not depend on colour alone
- Story 23 acceptance test passes

**M9.9 — Inline row editing** · 2h

_Story 24 — As a workspace member, I want to edit quantities from the row, so that updating stock after a working takes seconds._

Edit quantity, unit and threshold in place, with optimistic update and rollback on failure.

_Acceptance criteria:_

- Edit and save without navigation
- Failed save rolls back and explains why
- Keyboard operable end to end
- Story 24 acceptance test passes

**M9.10 — Soft delete with confirmation** · 1h

_Story 25 — As a workspace member, I want deletion to ask first and be recoverable, so that a mis-tap does not lose a record._

Confirmation dialog naming the item, then a soft delete that removes it from the list immediately.

_Acceptance criteria:_

- Confirmation names the specific item
- Cancel leaves everything unchanged
- Row disappears without a full page reload
- Record is soft-deleted, not removed

**M9.11 — Empty state** · 1h

_Story 26 — As a new workspace member, I want an empty ingredient list to prompt my first addition, so that I know what to do next._

Distinguish a genuinely empty ingredient list from a filtered-to-nothing view — the first offers an add action, the second offers to clear filters.

_Acceptance criteria:_

- An empty ingredient list prompts the first add
- No-results-from-filters offers to clear them
- The two states are not confused
- Story 26 acceptance test passes

**M9.12 — Add-from-compendium flow** · 2h

_Story 14 — As a workspace member, I want to add a compendium entry to our ingredients with a quantity, so that browsing leads directly to a stocked item._

Wire the compendium page's action slot to addIngredientToWorkspace, with quantity and unit capture and a confirmation that links to the new ingredient row.

_Acceptance criteria:_

- Adding from the compendium creates the stock row
- Adding something already held is handled gracefully
- Confirmation links through to the ingredient list
- Story 14 acceptance test passes

## M10 — Grimoire

_22 tasks · 37 hours_

**Sequencing**

- M10.2 through M10.4 (schema and visibility) first. Visibility is a column and a policy, not a filter added later.
- M10.6 (visibility rules) blocks M10.9, M10.11 and M10.13. Every list, search and page must filter in SQL, never after fetching.
- M10.7 and M10.8 (pure comparison functions) block the comparison panel in M10.17.
- M10.15 reuses IngredientSearch from M8. If it needs changes, change it there rather than forking it.

### Grimoire data layer

**M10.1 — Acceptance test scaffold for stories 47–56** · 2h

_Stories 47–56 — As a developer, I want the grimoire stories expressed as failing tests before implementation, so that spell behaviour is specified rather than discovered._

Create `tests/acceptance/06-grimoire.test.ts` with failing tests naming each of stories 47 through 56.

_Acceptance criteria:_

- Ten failing tests, one per story
- Each names its story number and text
- make test-stories reports them

**M10.2 — spells and spell_ingredients schema** · 2h

_Stories 47 and 50 — As a workspace member, I want a spell recorded with its intent and its ingredients, so that I can repeat a working exactly._

Add `spells` (workspaceId, title, intent, jarSize, sealWaxColor, moonPhase, dayOfWeek, instructions, status draft|complete, audit) and `spell_ingredients` (spellId, ingredientId, quantity, unit, layerOrder, note, audit). The join references the ingredient, not the inventory item, so a saved spell survives running out.

_Acceptance criteria:_

- Migration applies cleanly
- spell_ingredients references ingredients, not inventory_items
- layerOrder is stored and unique within a spell
- status accepts only draft and complete in v1

**M10.3 — Spell visibility column and policy** · 1h

_Story:_ As a workspace member, I want to keep a spell to myself, so that I can record a working that is nobody else's business without leaving the workspace.

Add `visibility` (`private` | `workspace`) to spells, defaulting to workspace, and extend the RLS policy so the database filters private spells to their author. Two layers again: the service decides and the database backstops it, exactly as M6.3 and M6.4 do for membership.

_Acceptance criteria:_

- Column added with a default of workspace and no nulls
- RLS policy admits a private spell only to its author
- The policy is proved with the service check stubbed, as in M6.5
- Existing seeded spells migrate to workspace visibility

**M10.4 — spell_categories join table** · 1h

_Story 48 — As a workspace member, I want to assign categories describing what a spell is meant to do, so that intent is recorded alongside contents._

Join table mirroring ingredient_categories, with audit columns and both-direction indexes.

_Acceptance criteria:_

- Composite key prevents duplicates
- Indexed both ways
- Audit spread present

**M10.5 — Spell service with member and viewer rules** · 2h

_Story 56 — As a workspace member including a viewer, I want to read every spell in the grimoire, so that shared knowledge is actually shared._

Owners and members create and edit; viewers read and never write. Spells carry a visibility of `private` or `workspace`: a private spell is readable only by its author, a workspace spell by every member including viewers.

_Acceptance criteria:_

- Members and owners can create and edit
- Viewers can read workspace spells and create nothing, including private spells
- A private spell is invisible to every other member, including owners
- D cannot read W's spells by direct id at either visibility
- Story 56 acceptance test passes

**M10.6 — resolveSpellVisibility() and the one-way rule** · 2h

_Story:_ As a workspace member, I want a spell I shared to stay shared, so that nobody can quietly withdraw something the rest of us have been working from.

Pure function deciding who may read a spell, plus the transition rule: private may be widened to workspace, and workspace may never be narrowed to private. The asymmetry is deliberate. Once a spell is part of the shared grimoire the others have read it, may have built on it, and hiding it afterwards would remove something they were relying on while pretending it never existed. Widening is a gift and narrowing is a retraction, so only one of them is allowed. Exhaustively unit tested, both the read decision and every transition.

_Acceptance criteria:_

- Every combination of viewer relationship and visibility is tested
- Private resolves to the author only, including against owners
- private to workspace is permitted
- workspace to private is rejected with an error that explains why, not a bare Forbidden
- The rule is enforced in the service, not only absent from the UI
- Deleting a shared spell is still possible — this rule governs visibility, not existence
- No database access; pure function

**M10.7 — summarizeSpellCategories()** · 1h

_Story 52 precondition — As a workspace member, I want the categories of a spell's ingredients gathered into one set, so that I can compare what is in the jar against what I intended._

Pure function returning the deduped union of categories across a spell's ingredients. Unit tested including empty and duplicate cases.

_Acceptance criteria:_

- Union is deduped
- Empty ingredient list returns empty
- Order is stable
- No database access

**M10.8 — compareSpellCategories()** · 2h

_Story 52 — As a workspace member, I want gaps shown in both directions between intent and ingredients, so that I can see what is missing and what I did not plan for._

Pure function returning intended-not-present and present-not-intended. These are two distinct concepts and conflating them would be a bug.

_Acceptance criteria:_

- Intent categories with no ingredient backing are reported
- Ingredient categories outside the stated intent are reported
- Both empty when the sets match
- Unit tested in both directions

**M10.9 — grimoire and spell queries with derived fields** · 2h

_Story 52 — As a workspace member, I want the comparison available from the API, so that it is computed once rather than reimplemented in each view._

Add the queries exposing categories, derivedCategories and categoryGaps, with batched ingredient and category resolution. The grimoire list paginates through the M3.6 helper. Visibility filtering happens in the query, not after fetching — the same trap the note loader had, and the reason a private spell must never reach the resolver in the first place.

_Acceptance criteria:_

- derivedCategories computed from ingredients
- categoryGaps reports both directions
- Resolution is batched, asserted by query count
- Resolvers contain no database access
- Grimoire list paginates through the M3.6 helper, not an unbounded fetch
- Private spells are excluded in SQL, never fetched and filtered in the resolver

**M10.10 — createSpell and updateSpell mutations** · 2h

_Stories 47, 50 and 55 — As a workspace member, I want to create a spell, add ingredients and save it as a draft, so that I can build it over more than one sitting._

Both mutations with Zod validation, ingredient list handling and layer order assignment.

_Acceptance criteria:_

- A spell can be created with only a title
- Ingredients can be added and removed in one update
- layerOrder is assigned and preserved
- Viewers are rejected

### Grimoire UI

**M10.11 — Grimoire list page** · 2h

_Story 56 — As a workspace member, I want to browse our spells, so that I can find and reuse past workings._

`/coven/[slug]/grimoire` listing spells with title, intent, status and category chips. Searchable by title and intent text, and filterable by category and status. A grimoire is the thing you go back to, so finding a spell from six months ago by half-remembering its name is the primary use of this page, not browsing.

_Acceptance criteria:_

- Every spell in the workspace is listed for every member
- Search matches title and intent text, debounced
- Search combines with category and status filters rather than replacing them
- Draft and complete are visually distinct
- Search and filters persist in the URL
- axe clean, usable at 375px
- List is paginated; a workspace with hundreds of spells does not render them all
- Search, filters and pagination all respect visibility; a private spell never appears in another member's count or page

**M10.12 — SpellBuilder — title, intent and jar fields** · 2h

_Story 47 — As a workspace member, I want to name a spell and state its intent, so that I know what it was for months later._

`/coven/[slug]/grimoire/new` with the spell-level fields: title, intent, jarSize, sealWaxColor, moonPhase, dayOfWeek, instructions.

_Acceptance criteria:_

- Only title is required
- All jar fields are editable and persist
- Validation errors appear inline
- Story 47 acceptance test passes

**M10.13 — Visibility control in the spell builder** · 2h

_Story:_ As a workspace member, I want to choose whether a spell is mine or ours while I build it, so that I decide before anyone has seen it rather than afterwards.

Visibility control on the builder, defaulting to workspace. Private spells are badged in the grimoire list so the author can tell at a glance which of their spells the others can see. Once a spell is workspace-visible the control becomes read-only with a line explaining that sharing is permanent — better stated plainly than discovered by a rejected mutation.

_Acceptance criteria:_

- Visibility is set at creation and defaults to workspace
- A private spell can be shared to the workspace in one action, with confirmation
- A workspace spell shows the control as read-only, with the reason
- Private spells are badged in the grimoire list for their author
- The badge is not colour-only
- Attempting to narrow through the API is still rejected, per M10.6

**M10.14 — SpellBuilder — assign intent categories** · 2h

_Story 48 — As a workspace member, I want to tag a spell with intent categories, so that I can find it by purpose._

Grouped category chips reused from IngredientSearch, bound to the spell's own categories rather than a filter.

_Acceptance criteria:_

- Chips select and deselect spell categories
- Grouping and collapsing behave as on the search component
- Selections persist on save
- Story 48 acceptance test passes

**M10.15 — SpellBuilder — add and remove ingredients** · 2h

_Stories 49 and 50 — As a workspace member, I want the same search controls as my ingredients page and to add ingredients with a quantity, so that building a spell uses tools I already know._

Compose IngredientSearch with an Add to jar action slot, plus quantity and unit capture per ingredient and a remove control.

_Acceptance criteria:_

- Search behaves identically to the workspace ingredients page
- Quantity and unit are captured per ingredient
- Removing an ingredient updates derived categories immediately
- Story 49 and 50 acceptance tests pass

**M10.16 — SpellBuilder — reorder for layer order** · 2h

_Story 51 — As a workspace member, I want to reorder ingredients, so that layering sequence is recorded as part of the recipe._

Reordering with both pointer and keyboard affordances, persisting layerOrder.

_Acceptance criteria:_

- Order can be changed by keyboard alone
- New order persists on save
- Order is announced to assistive technology
- Story 51 acceptance test passes

**M10.17 — Intent versus derived category comparison panel** · 2h

_Story 52 — As a workspace member, I want to see where intent and contents disagree while I build, so that I can correct the jar rather than discover it later._

Sidebar showing assigned intent alongside the derived union, flagging both directions — tagged for prosperity with nothing carrying it, and mugwort adding psychic work that was not intended. Weight the second list by whether the ingredient is pulling its weight elsewhere. An ingredient contributing an intended category and one stray one is doing its job and the stray is a footnote; an ingredient contributing nothing intended is the one worth looking at. Same list, two levels of emphasis, so the eye lands on the ingredient that has no reason to be in the jar.

_Acceptance criteria:_

- Both gap directions are shown with distinct wording
- An unintended category from an ingredient that also carries an intended one is de-emphasised
- An ingredient contributing nothing intended is emphasised
- Emphasis is conveyed by more than colour or weight alone, so it survives a screen reader
- Panel updates as ingredients change
- No gaps renders a clear matched state
- Story 52 acceptance test passes

**M10.18 — Safety warning for toxic ingredients** · 1h

_Story 53 — As a workspace member, I want a warning when an ingredient is toxic or unsafe to burn, so that I do not harm myself or someone I give it to._

Surface safetyNotes prominently when such an ingredient is added, without blocking the addition.

_Acceptance criteria:_

- Warning appears on add and remains visible in the list
- Warning does not block the action
- Announced to assistive technology
- Story 53 acceptance test passes

**M10.19 — Out-of-stock indicator while building** · 1h

_Story 54 — As a workspace member, I want to see when I am adding something we have none of, so that I know what to gather before starting._

Compare against the workspace's stock and flag ingredients with none on hand, or held below the quantity called for.

_Acceptance criteria:_

- Zero stock is flagged on add
- Insufficient quantity is flagged distinctly from zero
- Compendium ingredients not in the workspace's ingredients are flagged as not held
- Story 54 acceptance test passes

**M10.20 — Save as draft and mark complete** · 1h

_Story 55 — As a workspace member, I want to save a spell as a draft and mark it complete later, so that an unfinished spell is not mistaken for a finished one._

Status control with draft as the default, and completion as an explicit action.

_Acceptance criteria:_

- New spells default to draft
- Marking complete is explicit and reversible
- Status is visible in the grimoire list
- Story 55 acceptance test passes

**M10.21 — Spell survives a soft-deleted inventory item** · 1h

_Story:_ As a user, I want a saved spell to remain intact after I run out of something so that my record of a working is not damaged by stock changes.

Test that soft-deleting an inventory item leaves the spell's ingredient list intact, since spell_ingredients references the ingredient, not the stock row.

_Acceptance criteria:_

- Spell renders fully after the stock row is deleted
- Ingredient shows as not held rather than disappearing
- No foreign key error occurs

**M10.22 — Spell recipe print layout** · 2h

_Story:_ As a user, I want a printable recipe so that I can work from paper without a screen beside the jar.

Create `_print.scss` — this is the only view in v1 that gets print styling. Spell layout: ingredients in layer order with quantities, instructions, and correspondences. Navigation and controls suppressed. Add a visible print control on the spell page: nobody thinks to reach for a browser menu on a phone, and a print stylesheet with no way to invoke it is a feature only its author knows about.

_Acceptance criteria:_

- A print control is visible on the spell page and triggers the print dialog
- The control is keyboard reachable and labelled
- The control does not itself appear in the printed output
- Prints on one page for a typical spell
- Layer order and quantities are legible
- Interactive chrome is hidden
- Print styles are scoped to this view and do not leak into others

## M11 — Hardening and launch

_14 tasks · 22 hours_

**Sequencing**

- Every other milestone must be complete. This is verification, not construction.
- M11.8 (axe sweep) depends on every page existing.
- M11.13 (full story checklist green) gates M11.14 (release).

### End-to-end suite

**M11.1 — E2E: admin adds a compendium entry** · 2h

_Story 18 — As a site admin, I want compendium curation to work through the real interface against a production build, so that the path users take is the path that is tested._

Playwright spec signing in as E, creating a compendium entry, and verifying it appears for a non-admin user.

_Acceptance criteria:_

- Spec passes against the production build on 8001
- Runs against sorrel_e2e, reseeded beforehand
- axe scan on each page visited

**M11.2 — E2E: add a compendium ingredient to a workspace** · 2h

_Story 14 — As a workspace member, I want adding a compendium entry to our ingredients to work end to end, so that the core daily loop is verified._

As A, add the compendium entry created in M11.1 to W's ingredients with a quantity, and confirm it appears with its stock and default threshold.

_Acceptance criteria:_

- Stock row appears in W's ingredients
- Quantity and unit are as entered
- Default low-stock threshold is applied and visible
- Survives a page reload
- axe scan clean

**M11.3 — E2E: build a spell and check the category comparison** · 2h

_Stories 47–52 — As a workspace member, I want spell building and the category comparison to work end to end, so that the most complex screen is verified as a whole._

As A, build a spell with intent categories and ingredients, and assert the comparison panel reports the expected gaps in both directions.

_Acceptance criteria:_

- Spell saves with ingredients in layer order
- Comparison panel shows both gap directions
- Spell appears in the grimoire list
- axe scan clean with the builder open

**M11.4 — E2E: invite, accept, and land in the workspace** · 2h

_Stories 4 and 6 — As a workspace owner, I want inviting a member to work end to end, so that sharing behaves as promised._

As A, generate an invite link at member role; as B, accept it, sign in, and land in W with the ingredient list visible.

_Acceptance criteria:_

- Invite link is copyable and single-use
- B lands in W at the invited role
- B sees W's ingredients and grimoire
- Reusing the link afterwards is rejected

**M11.5 — E2E: viewer reads but cannot edit** · 1h

_Story 12 — As a viewer, I want my read-only access verified end to end, so that the role means what it says._

As C, read the ingredients and grimoire, and confirm no write controls are rendered anywhere.

_Acceptance criteria:_

- No write controls rendered for C
- C can read every spell
- A direct mutation attempt is rejected

**M11.6 — E2E: outsider sees nothing** · 1h

_Story 19 — As a workspace owner, I want isolation from other workspaces verified end to end, so that privacy is proven rather than assumed._

As D, attempt to reach W's ingredients and grimoire by URL and confirm 404 throughout.

_Acceptance criteria:_

- Every W route returns 404 for D
- No workspace name or content leaks in the response
- D's own workspace X is unaffected

**M11.7 — E2E: soft delete disappears from the list** · 1h

_Story 25 — As a workspace member, I want soft delete verified end to end, so that removal behaves the same way in the browser as in the service tests._

As A, soft-delete an ingredient, confirm it leaves the list, and confirm the same name can be added again.

_Acceptance criteria:_

- Item disappears without reload
- Re-adding the same name succeeds
- Record remains in the database

### Launch readiness

**M11.8 — axe scans across every page and modal** · 2h

_Story:_ As a user relying on assistive technology, I want every page and modal to meet the standard so that no part of the app is closed to me.

Extend the e2e specs to scan each route and each open modal. Accessibility is asserted here, not via vitest-axe.

_Acceptance criteria:_

- Every route in §9 is scanned
- Every modal is scanned while open
- Zero violations at the configured level
- Scan list is maintained alongside the route table

**M11.9 — Cold-start skeleton states** · 2h

_Story:_ As a user returning after a quiet week, I want the first paint to be immediate so that Neon's resume is invisible rather than looking broken.

Add skeletons for the first paint on every data-backed route. No assumption that the first query returns in under 50ms.

_Acceptance criteria:_

- Every data-backed route has a skeleton
- Skeletons match final layout closely enough to avoid a jump
- Tested with an artificially delayed first query
- Respects prefers-reduced-motion

**M11.10 — Error boundaries and 404/500 pages** · 2h

_Story:_ As a user, I want failures to be legible so that an error is a message rather than a blank screen.

Route-level error boundaries plus styled 404 and 500 pages, with a route back to somewhere useful.

_Acceptance criteria:_

- A thrown error renders the boundary, not a blank page
- 404 and 500 are styled and offer a way onward
- No stack traces reach production output
- Boundaries do not swallow authorization redirects

**M11.11 — Verify coverage thresholds and acceptance reporting** · 1h

_Story:_ As a developer, I want the gates proven before release so that the first post-launch PR is not the one that discovers they were misconfigured.

Confirm the 80% thresholds hold on both suites and that acceptance coverage reports separately from line coverage.

_Acceptance criteria:_

- Both suites report at or above 80% on all four metrics
- A deliberate coverage drop fails CI
- Acceptance coverage is reported separately
- Coverage artifacts upload on every run

**M11.12 — claude-docs completeness pass** · 2h

_Story:_ As a future maintainer, I want each subsystem and component documented so that the design decisions survive the people who made them.

Write the subsystem summaries and one doc per component, and bring the append-only transcript up to date.

_Acceptance criteria:_

- A summary exists for auth, data, GraphQL, ingredients, grimoire and CI
- Every component in src/components has a doc
- Transcript is current
- Vocabulary is used consistently throughout

**M11.13 — Full story checklist green** · 1h

_Story:_ As a product owner, I want every one of the 44 stories passing so that done is measured against the specification.

Run `make test-stories` and confirm all 44 pass. Any deferral is recorded explicitly rather than left silently failing.

_Acceptance criteria:_

- All 44 stories report pass
- Output is captured in claude-docs as the release record
- No test is skipped to achieve the result

**M11.14 — Promote release/1.0.0 to main** · 1h

_Story:_ As a developer, I want v1 released through the standard Gitflow path so that the first production deploy exercises the same process as every later one.

Cut `release/1.0.0` from staging, promote through the merge queue, confirm migrations applied and the production deploy is healthy.

_Acceptance criteria:_

- Release branch passes the full gate
- Migrations applied to production before traffic
- Production smoke check passes
- main-sync branch opened to bring main back down
