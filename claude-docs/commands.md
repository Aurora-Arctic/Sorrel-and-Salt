# Commands — summary

Every command the repo runs, and where it runs. `CLAUDE.md` keeps the ten a
task reaches for; this is the rest.

**Two places run them.** `make help` lists every target from the **host**.
Neither `make` nor `docker` is installed in the devcontainer, so a session
running inside it calls the npm scripts directly, and the `make` column below is
the host equivalent. **There is no Python in the devcontainer** either: neither
`python3` nor `python` exists, so quick scripting, JSON munging or arithmetic
goes through Node (`node -e`), the npm scripts, or `jq`, `grep` and `sed`.

**Verify with `test:coverage`, not `test`.** A plain `npm run test` pass can
still fail CI on the 80% threshold (lines, branches, functions, statements)
alone.

**Deploys are CI-only (M0.26).** `.github/workflows/deploy.yml` deploys via the
Vercel CLI (`vercel pull`/`build`/`deploy --prebuilt`/`alias`) on a push to
`main` (production) or `staging` (preview, aliased to the staging domain), and
on a `hotfix/** → main` PR (a per-PR preview, commented on the PR and torn down
on close). `vercel.json` sets `deploymentEnabled: { "**": false }`, so Vercel's
Git integration deploys nothing and the workflow is the only path. There is no
local deploy command ([`ci/deploy.md`](ci/deploy.md), "Deploy").

## The app

| npm (`make`)                                           | Purpose                                                                                                                                                                                                        |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev` (`make dev`)                             | Next.js dev server on **8000**; a signed-in browser opening `/api/graphql` gets Altair, for running queries by hand ([`manual-api-testing.md`](manual-api-testing.md))                                         |
| `npm run dev:debug` (`make dev-debug`)                 | The dev server with the Node inspector on **9229** ([`debugging.md`](debugging.md))                                                                                                                            |
| `npm run build` / `start` (`make build` / `start`)     | Production build; e2e serves it on **8001** and up, one server per worker, plus **8100** for the configured-providers spec                                                                                     |
| `npm run lint` / `lint:fix` (`make lint` / `lint-fix`) | Oxlint                                                                                                                                                                                                         |
| `npm run format` / `format:check`                      | Prettier, writing or checking                                                                                                                                                                                  |
| `npm run typecheck` (`make typecheck`)                 | `tsc --noEmit`                                                                                                                                                                                                 |
| `npm run pre-commit` (`make pre-commit`)               | `lint`, `format:check` and `typecheck` — test-free by decision (MB.38); the mechanical guards in `tests/guards/` run in CI's `vitest` job                                                                      |
| `npm run codegen` (`make codegen`)                     | Regenerates the client types in `src/gql/` from the committed SDL (`codegen.ts`, graphql-codegen's `client-preset`); commit the output, since `tests/guards/codegen-staleness.test.ts` fails CI on stale files |

## Tests

| npm (`make`)                                       | Purpose                                                                                                                                                                                                                                              |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:coverage`                            | `vitest run --coverage` — the `unit` (node), `dom` (jsdom), `db` (node/Postgres) and `rsc` projects, 80% threshold                                                                                                                                   |
| `npm run test:stories` (`make test-stories`)       | The acceptance suite only (`tests/acceptance/`, on `vitest.stories.config.mts`), printed as a checklist of the 51 v1 stories from DESIGN.md §10 — passing, failing, skipped or _no test yet_ (M1.28). No coverage: a story never moves the threshold |
| `npm run test:debug` (`make test-debug`)           | Vitest under `--inspect-brk` on **9230**, one worker, halted until a debugger attaches                                                                                                                                                               |
| `npm run test:ui` (`make test-ui`)                 | The Vitest UI on its default port                                                                                                                                                                                                                    |
| `npm run e2e`                                      | Playwright against the production build, one database and one server per worker (`E2E_WORKERS`)                                                                                                                                                      |
| `npm run e2e:ui` / `e2e:debug` (`make e2e-ui`)     | Playwright UI mode on **9324**, or the inspector                                                                                                                                                                                                     |
| `npm run e2e:trace` (`make e2e-trace TRACE=<zip>`) | Serves a written trace on **9323**                                                                                                                                                                                                                   |

## The database

| npm (`make`)                                                   | Purpose                                                                                                                                                                                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run db:generate` / `db:migrate` (`make db-*`)             | `drizzle-kit generate` / `migrate` (M1.3)                                                                                                                                                                                                              |
| `npm run db:seed` / `db:drop` / `db:reset` (`make db-*`)       | `db:seed` seeds the scenario `SEED_SCENARIO` names, via `tsx` — `minimal` (M1.21), `standard` (M1.22) or `demo` (M1.23), defaulting to `minimal` and refusing an unrecognised name rather than falling back; `db:reset` is drop, migrate, seed (M1.24) |
| `npm run db:seed:categories`                                   | Seeds §6's eight category groups and 63 categories (M4.3) — reference data, not a scenario; `migrate.yml` runs it on staging and production                                                                                                            |
| `npm run db:seed:forms`                                        | Seeds §5's six ingredient form groups and 78 forms (M4.3a) — reference data too, run by `migrate.yml` in the same step as the categories                                                                                                               |
| `npm run db:seed:astrology`                                    | Seeds §5's planet and zodiac vocabularies, nineteen bodies and thirteen signs (MB.93) — reference data, run by `migrate.yml` in the same step as the other two                                                                                         |
| `npm run db:seed:deities`                                      | Seeds the deity vocabulary, thirty-five traditions and 216 deities from `claude-docs/db/deity-vocabulary-seed.md` (MB.129) — reference data, run by `migrate.yml` in the same step as the other three                                                  |
| `npm run db:studio` (`make db-studio`)                         | Drizzle Studio on **4983**, browsing the local database via `drizzle.config.ts`; the UI is `https://local.drizzle.studio`                                                                                                                              |
| `make db-psql`                                                 | `psql` against the compose Postgres service (host only)                                                                                                                                                                                                |
| `npm run check:destructive-ddl` (`make check-destructive-ddl`) | Scans migrations new on this branch against its Gitflow base; `-- --base <ref>` picks another, `-- --all` audits every committed migration ([`db/expand-contract.md`](db/expand-contract.md), "Expand/contract and the destructive-DDL check")         |
| `npm run check:migration-order` (`make check-migration-order`) | Refuses a migration older than its Gitflow base's newest, or ahead of one the base has; `-- --base <ref>` picks another base ([`db/migrations-and-scripts.md`](db/migrations-and-scripts.md), "Migration order")                                       |

## The workshop

| npm (`make`)                                                               | Purpose                                                                                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run workshop` / `workshop:build` (`make workshop` / `workshop-build`) | Ladle component workshop on **61000**; `:build` is the static export, wrapped so a story that fails to bundle actually exits non-zero |

## The local stack (host only)

| `make`                 | Purpose                                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `make docker-up`       | App + Postgres 18 locally, no Neon connection needed; the one-shot `db-init` container migrates and seeds before the app starts (M1.24)            |
| `make docker-workshop` | Also brings up the Ladle workshop, on **61000**                                                                                                    |
| `make docker-studio`   | Also brings up Drizzle Studio, on **4983**                                                                                                         |
| `make docker-all`      | App + Postgres + workshop + studio + the Playwright browser server (`:7900`, MB.23), all at once — `e2e` itself stays opt-in via `make docker-e2e` |
| `make docker-e2e`      | The Playwright suite once, against the dedicated e2e image                                                                                         |
| `make docker-down`     | Stops and removes the stack, named volumes kept; `make docker-rebuild` tears down with the volumes and starts again                                |
| `make act-check`       | Runs a check locally via `act`; `act-check CHECK=<leg>` picks a `checks.yml` leg, and `make act-test` chains every locally runnable one            |
