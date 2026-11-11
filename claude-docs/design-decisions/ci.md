# CI decisions

How tests, the test databases, the CI pipeline and the linters are set up, and the choices that were measured or ruled out.

## Test database isolation: per-worker clone vs. rolled-back transaction

Two ways to give parallel Vitest `db`-project workers isolated Postgres
state were on the table: give each worker its own real database, or run
every test inside a transaction that starts before the test and rolls back
after, so nothing a test writes is ever actually committed.

### Decided

**Each worker gets its own real database**, cloned from `sorrel_template`
with `CREATE DATABASE sorrel_test_<n> TEMPLATE sorrel_template` in a Vitest
`globalSetup` (`tests/support/db-global-setup.ts`), and dropped (`DROP DATABASE
IF EXISTS` first, so a crashed prior run self-heals) in that same setup's
returned teardown. Postgres copies a template's files directly rather than
replaying anything, so this clone is fast — no further optimisation (e.g.
skipping the drop-first when nothing is there to drop) is needed.

### Rules this sets

- **Never wrap a `db`-project test in a rolled-back transaction.** Use the
  per-worker database as-is; open and commit real transactions.
- A test that needs a clean table between assertions truncates or deletes
  explicitly — there is no ambient rollback to rely on.
- This applies to `src/db/**` and `src/services/**` tests specifically
  (anything that can reach `withAudit`). It has no bearing on `unit`-project
  tests, which never touch Postgres at all.

### Amendment — 2026-09-12 (MB.14)

The decision above stands unchanged; only the **index** the clones are named
by has been corrected.

`tests/support/db-setup.ts` named the database `sorrel_test_${VITEST_WORKER_ID}`
while `tests/support/db-global-setup.ts` cloned one per `maxWorkers`. Those index
different things. Vitest exposes `VITEST_POOL_ID`, the pool slot, documented
as "Value is between 1-`maxWorkers`" — and `VITEST_WORKER_ID`, a counter
incremented once per test file across the whole run, both projects, which
therefore exceeds `maxWorkers` as soon as there are more test files than
workers. The mismatch was silent while the repo was small; at eleven test
files on a three-worker CI runner the isolation spec asked for a
`sorrel_test_4` nobody had cloned, and three tests failed on PR #78 with
`database "sorrel_test_4" does not exist`.

Both halves now go through `tests/support/worker-database.ts`, so the name has one
spelling, and `globalSetup` `provide`s the list of databases it created for
the isolation spec to assert membership of. A missing `DATABASE_URL` or
`VITEST_POOL_ID` throws by name there rather than producing
`sorrel_test_undefined` and failing one connection later as a Postgres error.

#### Rules this adds

- **Name the per-worker database from `VITEST_POOL_ID`.** `VITEST_WORKER_ID`
  identifies a test file, not a worker slot, whatever its name suggests.
- **A worker must assert its database is one `globalSetup` made**, rather
  than recomputing the bound and agreeing with itself.
- `vitest.config.mts`'s pinned `dbMaxWorkers` must keep mirroring Vitest's
  own default (`availableParallelism() - 1`): both projects share one pool
  group, and Vitest throws if projects in a group disagree on `maxWorkers` —
  which is what keeps every slot backed by a clone.

### Amendment — 2026-09-19 (M1.27)

The decision above stands unchanged; what the clones are made **from**, and
**how often**, has changed.

`globalSetup` now clones `sorrel_template` into `sorrel_test_template`,
migrates it and seeds the `standard` scenario — via
`tests/support/seeded-database.ts`, which spawns the same `db:migrate` /
`db:seed` scripts compose's `db-init` runs — and the per-slot databases are
cloned from that. `tests/support/db-setup.ts`, which runs once per test file
rather than once per worker, re-clones the slot's database from the template
before pointing `DATABASE_URL` at it. Until M1.27 the template was empty and
every db test file built the tables it needed; now no file builds any, and
none can leave anything behind for the next.
The argument for building the template at setup rather than into the image is in "The seeded test template is built at test-run setup, not baked into the Postgres image" below.

#### Rules this adds

- **A db test file may assume the full schema and the `standard` scenario at
  its start**, and nothing else — not the contents of the previous file.
- **A file that needs an empty table truncates it, `cascade`.** Every child
  foreign key in the schema is `NO ACTION`, so `delete from` against seeded
  rows is refused; and "a clean table between assertions" (the rule above)
  is still the file's own job _within_ the file.
- **No file drops schema or restores rows in `afterAll`.** The re-clone
  makes it unnecessary, and a drop of something the schema owns (a type, the
  `set_updated_at` function) is a bug the re-clone would hide.
- **A db test file does not end by leaving its pool open on purpose** — but
  if it does, `WITH (FORCE)` in the re-clone terminates it rather than
  failing the next file.

## E2E reseeding: recreate from template, not `src/db/seed`

**Status:** superseded in part by M1.27 (2026-09-19) · **Date:** 2026-09-10

_What stands:_ `tests/e2e/` (the `e2e/` the body names, moved there since) still
never calls `src/db/seed` directly, and each
spec file's reseed is still a clone of a template. _What changed:_ the
template is no longer the empty `sorrel_template` but `sorrel_e2e_template`,
built once per run by `tests/e2e/global-setup.ts` through
`tests/support/seeded-database.ts` — cloned, migrated and `standard`-seeded —
so a reseed now yields real content. "Until M1.27 bakes them into the
Postgres image" below records what was expected at the time; M1.27 populated
the template at setup instead
(see "The seeded test template is built at test-run setup, not baked into the Postgres image" below).
The body is kept as written.

The task text ("`globalSetup` prepares `sorrel_e2e`; specs truncate and
reseed between files") reads as: specs call `src/db/seed`'s `seed()`, the
same module Docker and Vitest are architected to share (`.claude/rules/testing.md`'s "one
seed module, three consumers"). That's not what this task implements.

### Decided

`e2e/database.ts`'s `recreateE2eDatabase()` — `DROP DATABASE IF EXISTS
sorrel_e2e` / `CREATE DATABASE sorrel_e2e TEMPLATE sorrel_template`, the same
operation M1.9's Vitest `globalSetup` does per worker — is both what
`e2e/global-setup.ts` calls once for the whole run, and what each spec
file's own `test.beforeAll` calls again as its "reseed between files" step.
Nothing in `e2e/` imports `src/db/seed`.

### Why recreate-from-template still satisfies the task

Recreating `sorrel_e2e` from `sorrel_template` between spec files gives every
file the same known baseline `sorrel_template` currently holds — which is
also what "reseed" would mean structurally once `seed()` and the template
both carry real content. Once M1.21-23 implement `seed()` and M1.27 bakes it
into `sorrel_template`'s build, `recreateE2eDatabase()` needs no change: the
same `CREATE DATABASE ... TEMPLATE` picks up whatever the template now
contains. This mirrors M1.9's Vitest `db` project, which also only clones an
empty template today (see "Test database isolation: per-worker clone vs. rolled-back transaction" above) with no test yet
exercising seeded content, and was accepted as complete on that basis.

### Rules this sets

- A future spec file that needs seeded fixture data waits on M1.21-23
  (`seed()` implemented, done as of M1.23) and M1.27 (`sorrel_template` baked
  with it) — not on any change to `e2e/database.ts` or `e2e/global-setup.ts`.
- `e2e/` code should not special-case `seed()`'s current "not implemented"
  error. If a spec needs `seed()` to actually run, that spec doesn't exist
  yet. Since M1.23 there is no such error to special-case; the rule survives
  as its general form, that `e2e/` does not branch on how far the seed has
  got.

## The seeded test template is built at test-run setup, not baked into the Postgres image

**Status:** decided. Live home: `tests/support/seeded-database.ts` and `tests/support/db-setup.ts`; the harness is `.claude/rules/testing.md`.

### Decision

- The template is built once per test run, from the checkout. `tests/support/seeded-database.ts` clones the extensions-only `sorrel_template` into `sorrel_test_template`, then runs `npm run db:migrate` and `SEED_SCENARIO=standard npm run db:seed` against it, the same two scripts `Docker/docker-compose.yaml`'s `db-init` runs. Vitest's `globalSetup` clones one database per worker slot from it, and `tests/support/db-setup.ts` re-clones the slot's database before every test file. Playwright does the same with `sorrel_e2e_template` and one `sorrel_e2e_<slot>` per worker.
- Nothing about the schema or the seed is baked into the Postgres image. `Dockerfile.postgres` carries extensions and roles; `src/db/**` is not in its tag hash.
- `db:migrate` and `db:seed` are the one path. Compose, the Vitest harness and the Playwright harness all run them. A third mechanism (importing the migrator, a hand-rolled SQL applier) is a divergence.
- A db test file starts from the full schema and the `standard` scenario and builds neither. Its parent ids are the seed's (`FIXTURE_USERS.A`, workspace W), `beforeEach` truncates with `cascade`, and a file about seeding truncates every table first. A task that wants another baseline seeds on top or truncates within its own file; it does not ask the harness for a second template.

### Why

Migrate took 0.54 s and seed 0.43 s, so a bake saves about one second per run. A clone costs about 30 ms either way, so `CREATE DATABASE … TEMPLATE` stays the primitive. Against that saving, a bake needs:

- A Node toolchain in the Postgres image build, because the seed is TypeScript and the migrator is `drizzle-kit`.
- An image rebuild on every migration PR.
- A stale-template bug: compose builds the image locally and does not rebuild it on `up`, so after a pull that brought a migration every test run would use the old schema. A template built from the checkout cannot disagree with it.
- A pinned seed clock, since `applyAudit` stamps `new Date()` on every seeded row and byte-identical local and CI images would not otherwise be possible.
- A check only CI can run, since `docker` is not in the devcontainer.

### Rules out

- Migrations or the seed in `Dockerfile.postgres`, or `src/db/**` in its build context.
- A db test that stubs parent tables, applies one migration's statements or drops tables in `afterAll`.
- A second harness template for a different baseline.

## Stories are browser flows

**Decided 2026-10-16 by the owner, while starting M9.1.** A user story is proved by a browser flow a user could walk, never by a service call or a GraphQL response. A story test with no live page to walk is written as a browser flow that is skipped until the page exists, or it is dropped.

### Why this changed

`DESIGN.md` §11 ("Acceptance tests — story traceability") made `tests/acceptance/*.test.ts` the definition of done. Those were Vitest files that called services directly. The example in §11 was a service call, and the reason was assumed rather than argued. Two things kept the choice in place:

- The red-scaffold pattern. A service test can land before its page exists, so each wave could open with a failing suite.
- CI cost. MB.224's layer-ownership rules treated a browser run as the expensive layer.

The owner's view: "Stories should be testing user flows, not data transactions." A service test proves the service. It does not prove that a person can do the thing the story describes.

### What it replaces

- **M9.17's ` · browser` column.** M9.17 let an end-to-end spec tag the stories it walked, and the checklist showed them in a separate column beside the Node test. With the story suite itself in the browser, the tag alone decides a story's status and the column has no job.
- **Rule 9 of `claude-docs/testing/layer-ownership.md`**, which said an end-to-end test never re-runs a flow an acceptance test covers. The story suite is now the browser suite, so a gate spec proves only what no story walks.

### The two suites

| Suite    | Where                         | Command                | CI                                                    | Role                                                      |
| -------- | ----------------------------- | ---------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| Gate e2e | `tests/e2e/*.spec.ts`         | `npm run e2e`          | `playwright.yml`, on the merge gate                   | What no story walks: edge cases, accessibility, providers |
| Stories  | `tests/e2e/stories/*.spec.ts` | `npm run test:stories` | `pr-gate.yml`'s `stories` job, never a required check | One browser flow per story, tagged `@story-N`             |

- The stories config (`playwright.stories.config.ts`) shares the gate's servers and databases through `baseConfig` and `slotServers` in `playwright.config.ts`.
- The checklist reporter (`tests/support/story-playwright-reporter.ts`) reads the tags and prints one line per v1 story. An untagged test fails the run. A tag naming a v2 story number is listed as not a v1 story.
- **A flaky story reads as failing.** Retries run so the suite finishes, but a test that passed only on retry is reported as failing, so the cause gets fixed.
- A story whose page is unbuilt is a `test.fixme` naming the task that builds the page. That task unskips it in its own PR.
- The story suite runs as the PR gate's `stories` job, never a required check, so a red scaffold is never on the merge path. It runs beside the gate's other jobs and nothing waits on it, so the gate's time falls rather than rises.
- **Corrected before merge: a gate job, not its own workflow.** The plan gave the suite a workflow of its own, `stories.yml`, for the two reasons above. Neither needs one. A job blocks a merge only if the ruleset requires its check, and one that nothing waits on adds nothing to the gate's time. A separate workflow ran its own image jobs, which raced the gate's and could build an image twice when its Dockerfile or the lockfile changed, and lacked the gate's `gitflow` check and cancel-on-close. The owner chose the gate job. What the separate workflow alone did, a run on each push to `staging` and by hand, is dropped: every pull request has already run the suite, and `npm run test:stories` gives the checklist for any branch.

### Consequences

- `tests/acceptance/` and `vitest.stories.config.mts` are gone.
- A gate e2e test that a story flow now proves is deleted, and the survivors are justified.
- Tests stay the guardrails: a flow is never thinned to save tokens. Locators use role and label, assertions check state, and nothing asserts copy.

### Mapping

#### Old acceptance tests and the flows that replace them

Each old Node test (Vitest, against the services) was deleted with `tests/acceptance/`. Each story it covered is now walked in the browser, in the file below. A story whose page is not built yet is a `test.fixme` naming the task that builds it.

| Old file (deleted)                            | Stories    | Replaced by, under `tests/e2e/stories/`                                     |
| --------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| `tests/acceptance/01-accounts.test.ts`        | 1, 2, 3, 8 | `01-accounts.spec.ts`                                                       |
|                                               | 4, 5, 6, 7 | `01-invitations.spec.ts`, with the expired and wrong-address refusals added |
|                                               | 9, 10, 11  | `01-members.spec.ts`                                                        |
|                                               | 12, 13     | `01-viewer.spec.ts`, fixme until M9.6, M10.11, M9.9 and M6.18               |
| `tests/acceptance/02-compendium.test.ts`      | 14, 15, 16 | `02-compendium.spec.ts`, fixme until M8.18, M8.19, M9.4 and M9.12           |
| (none: stories 20–27 had no scaffold)         | 20–27      | `03-ingredients.spec.ts`, fixme until M9.6–M9.11                            |
| `tests/acceptance/07-admin.test.ts`           | 17, 18     | `07-admin.spec.ts`, which adds story 19 as a flow of its own                |
| `tests/acceptance/08-email-and-admin.test.ts` | 58–62      | `08-email-and-admin.spec.ts`                                                |

What the browser cannot reach yet is said in the spec, not left as a gap:

- **Story 17 on the public compendium.** No compendium page exists until M8.18, so the proof today is the missing Admin link and the 403 on the entry's own edit address.
- **Story 19's ingredients and grimoire pages.** They join the 404 checks when M9.6 and M10.11 build them. The per-entity sweep of the services stays in the workspace-isolation suite, `tests/db/workspace-isolation.test.ts` (M6.6).
- **An accessibility scan of the 404 page.** The app draws Next's default 404, which has no main landmark and fails the scan, so the story flows leave that scan out until the app draws its own.

#### Gate tests deleted because a story now walks them

| Gate file                         | Deleted                                                                                                                                  | Proved by                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `sign-in.spec.ts`                 | whole file                                                                                                                               | stories 1, 2 (`01-accounts.spec.ts`)     |
| `coven-create.spec.ts`            | whole file                                                                                                                               | story 3                                  |
| `invite.spec.ts`                  | whole file                                                                                                                               | stories 4, 62                            |
| `admin-invitations.spec.ts`       | whole file                                                                                                                               | story 62                                 |
| `admin/privilege-changes.spec.ts` | whole file                                                                                                                               | stories 60, 61                           |
| `admin/modal-loading.spec.ts`     | whole file                                                                                                                               | story 18's compendium and category flows |
| `shell.spec.ts`                   | the two-coven switch                                                                                                                     | stories 3, 8                             |
| `coven.spec.ts`                   | the stranger's 404, the members page, the role controls, the last-owner refusal, the promotion, leaving, and both invitations-tab tests  | stories 4, 9, 10, 11                     |
| `workspace-invitation.spec.ts`    | the invite-by-mail flow, the used link, the revoked link                                                                                 | stories 4, 5, 7                          |
| `account.spec.ts`                 | an unverified account sent to the email page                                                                                             | story 58                                 |
| `admin.spec.ts`                   | every non-keeper 403, the user modal, each curated page's add, edit and delete, the category-in-use refusal, keeper grants and the pause | stories 17, 18, 19, 60                   |
| `admin-compendium.spec.ts`        | the non-keeper 403; the add, edit and delete steps                                                                                       | stories 17, 18                           |

#### Gate tests kept, because no story walks them

- `sign-in-configured-providers`, `compendium-cache`, `graphql`, `route-protection`, `smoke` and `axe`: what only a real server proves.
- `account.spec.ts`: the four sections' scans, the on-page navigation, the linked providers, and two MB.256 regressions.
- `shell.spec.ts`: the shell's navigation.
- `coven.spec.ts`: the fixture check and the keyboard reach to Overview.
- `workspace-invitation.spec.ts`: the notice on `/coven` and the account menu's count, a decline, and a link refused once its coven is deleted.
- `admin.spec.ts`: the layout and its navigation, the user list and its filter, an address naming no user, the approval and its revoke (M5.8), and the zodiac filter.
- `admin-compendium.spec.ts`: the page behind a modal does not scroll, the phone margin, and one untagged test for the form's control heights and its pickers inside the dialog.

## Specs tag the stories they walk

**Status:** decided. Live home: `claude-docs/testing/acceptance.md`.

### Decision

- **Each Playwright `test(…)` carries `{ tag: '@story-N' }` (or an array) only where the page is not walking it.** A test is read before it is tagged.
- **`npm run test:stories` is a text scan, not a Playwright run.** It reports which stories have a browser flow (`N with a browser flow`), and stray tags print under "Not a v1 story".
- **That list is the report, held by review** (rule 8).

### Why

Playwright is kept to what only a real server can prove; what was missing was traceability from a story to its browser proof, not a coverage rule.

### Rules out

- A coverage threshold for stories.

## Faster Playwright runs on the same CPU and RAM

**Status:** decided. Live home: `claude-docs/testing/e2e.md`.

### Decision

- **Each speed lever is one task and one PR**, measured before and after on the same tree: three runs, the median, wall time from `time` around `flock /tmp/sorrel-e2e.lock npx playwright test`, with per-file sums from the report. A measurement says whether the servers were warm, because local runs reuse servers already up.
- **Not pursued, and why:**
  - **Postgres `fsync=off` and friends** for the test instance: clones take tens of milliseconds and each test writes a handful of rows, so the saving is estimated at 1–3 s of summed test time, under a second of wall. Revisit only if a profile shows database waits.
  - **Trimming the double-theme and double-width axe scans:** they are the accessibility gate. A quarter fewer scans would save about 2 s of wall at 6 workers (estimate), not worth the coverage.
  - **Splitting the 12.9 s compendium flow:** the longest test plus startup is the floor of any run, and 12.9 s is under the 27.5 s ideal span, so it is off the critical path.
  - **`--only-changed`, project dependencies:** `--only-changed` does not fit a gate that must run everything; seeding already lives in `globalSetup`.
  - **CI sharding:** rejected at 56 tests, because the pulls cost more than it saved. Reversed at 563 tests: each extra shard costs about 3 minutes of repeated work and removes about 4 minutes of test time (`claude-docs/ci/runner-budget.md`, "Playwright shards").
  - **A smaller build** (`productionBrowserSourceMaps` off): shared with the coverage report CI needs, and a change to the production bundle.

### Why

A lever not measured against a stated baseline cannot be told from noise.

### Rules out

- Cutting accessibility scans for speed.

## Pre-commit on changed files only: lint-staged

**Status:** decided. Live home: `claude-docs/commands.md`, the `npm run pre-commit` entry; the config is `lint-staged.config.mjs`.

### Decision

- **`npm run pre-commit` uses lint-staged** to work out the changed-file list and hand it to each check. It is the one option that checks the copy being committed, not the working tree.
- **The `pre-commit` package stays as the hook installer**, so nothing changes in how hooks get set up.
- **lint-staged hides partially staged edits by default** (`--no-hide-partially-staged` turns that off); `--diff=HEAD` gives the by-hand run; a function entry runs a command once with no file list, which typecheck needs.

### Why

Hiding unstaged edits while the checks run, and restoring them after a failure or Ctrl-C, is the part most likely to go wrong in a script we write ourselves. lint-staged's real cost is one small package: `picomatch` and `tinyexec` are already in `node_modules`, so it adds only `string-argv`. It is also the standard tool.

### Rules out

- **A home-made script** using `git diff` and `picomatch`: it would check the working-tree copy of a staged file.
- **The `pre-commit` package alone**: it runs npm scripts by name and cannot pass them a file list.
- **nano-staged**: it says nothing about hiding unstaged edits, function entries build the command string by joining file names so quoting is ours, and it is about 1/200th as widely used.
- **lefthook**: it replaces the hook installer in every checkout and the devcontainer, which is a bigger change than the task asked for.

## Component tests run on happy-dom

**Status:** decided. Live home: `claude-docs/testing/where-tests-live.md`.

### Decision

The component project runs on happy-dom for the whole project, with no environment variable and no per-file choice.

### Why

A profile of the slowest file put the remaining jsdom cost in working out accessible names and hidden elements for every role query, which faithful queries must pay, so more jsdom tuning would not move it far. The fixes were small and library-agnostic.

### Rules out

- **Staying on jsdom:** its own performance release is already in the tree.
- **linkedom:** built for server rendering, without the computed styles role queries need.
- **Vitest's browser mode:** slower, and beyond a devcontainer that reaches browsers only through a remote server.
- **Per-file opt-in to happy-dom:** keeps two DOM libraries and needs environment detection in the setup.

## Test-suite audit, 2026-10-27

Base: staging after M10.6, M10.9 and M13.15 merged (M13.15 read through `git show origin/staging:`, the rest at the measuring run's HEAD). Seven read-only lanes; nothing under /app was edited and one local measuring run was made (`/app/.reports/audit-vitest.log`). Every count and second below is an estimate unless it says "measured" or "CI timing". The lane reports beside this file hold every file:line.

### 9. Owner decisions

The owner's ruling of 2026-10-27 is applied throughout: a task criterion or a code comment never overrides the testing rules, and the criterion is corrected in the PR that applies the rule. Under it these are settled, not asked: Q-L3-6 → delete revision-trigger.test.ts:58 and :69 and spells.test.ts:97, keep :37 and add it to rule 8's list, correct m13.md:195 and :197; Q-L2-10 (G3 with C4) → (b), rule 6 over the comment at workspace-isolation.test.ts:301, cut the five per-service site-admin copies and correct the sweep's two stale comments.

Each remaining question needs a choice from the owner before its cases move. "I recommend" is my pick; saying "accept the recommendations" settles every one of them.

#### Reversing a recorded decision or settling two docs that disagree

- **Q-L3-1 (MB.243).** The idempotent, no-resurrect and dry-run sweeps in tests/db/seed/index.test.ts read the real files under compendium/, which MB.243 chose and layer-ownership.md:33 records. X: keep them on the real files (about 14 CI s). Y: run them on the files fixture and let compendium-files.test.ts:58 and the fill sweep be the tests of the real corpus. I recommend Y.
- **Q-L3-4.** The audit CLI tests (42 cases; src/db/seed/compendium/audit*.ts, wiki-lookup.ts). X: delete under rule 1 (agent-only code). Y: keep, because the owner also runs `--apply`, which writes to the seed files. I recommend Y if the owner runs `--apply`, X otherwise.
- **Q-L7-3.** e2e.md:15 says "one axe scan per page state"; layer-ownership.md:111 says "per page". I need the owner to choose the wording; the e2e findings assume "per page state". I recommend "per page state".

#### Delete or keep tests of content, the harness or developer tooling

- **Q-L3-2.** retired-slugs, standard-stock and verified-users seed tests (9 cases), which MB.225 deleted once. I recommend deleting them under layer-ownership.md:33.
- **Q-L3-3.** deities.test.ts:180, the ruling that no deity is another's other name. I recommend moving the ruling into the seed doc's review and deleting the test.
- **Q-L3-5.** test-database-isolation.test.ts. I recommend keeping it: it is the only guard against a test writing to the `sorrel` database.
- **Q-L7-6.** axe.spec.ts's two tests of the scan helper. I recommend keeping both and naming the exception in rule 1.
- **Q-L6-6.** Four tests of the local GraphQL IDE (route.test.ts :69, :91, :110, :129). I recommend cutting them under rule 1.
- **Q-L6-7.** tests/guards/no-tracked-books.test.ts (repository content, not the app). I recommend keeping it and recording it as the one non-functional guard.
- **Q-L6-8.** Eight source-sweep guards (navigation, form-label, readable-spells-guard, compendium-review-mark :77/:82, focus-return, leave-guard, browser-floor, e2e-serial-chains). (a) move them to sorrel-lint rules, a task of its own, removing 21 Vitest cases; (b) keep them and add them to rule 8's allowed list, cutting only the three tests of their own regex. I recommend (a) for all but browser-floor.

#### Cut per-service copies in favour of a central proof (the concentration risk)

- **Q-L2-8 (O-C).** Five coven services each refuse another coven's owner or a removed member, which membership.test.ts:75 and :122 prove. I recommend keeping them (about 150 ms) as the catch for a hand-written check.
- **Q-L2-13 (V7).** form-suggestions and deity-suggestions each repeat the soft-delete and two scope cases over the one generic `findVocabularySuggestions`. I recommend cutting the six; each file keeps its direct-id refusal of D.
- **Q-L1-5.** workspace-ingredient-list.test.ts:540 proves the coven-list scope once per facet (6 rows) over one shared scope. I recommend keeping one row.
- **Q-L2-11 (O-G).** spell-reads.test.ts:70, listGrimoire's visibility case over the repository's SQL. I recommend keeping it.

#### Move a proof to its owner, or add a unit test first

- **Q-L1-2.** validation/ingredient-resolver.test.ts tests src/components/IngredientForm/values.ts. I recommend moving it to tests/components/IngredientForm/values.test.ts.
- **Q-L1-3.** Four rollback tests that cannot fail. I recommend deleting all four and relying on ingredient-categories.test.ts:139.
- **Q-L1-4.** `defaultThreshold`'s unit table through the database. I recommend a pure test under validation/ and one database row per call site.
- **Q-L2-9 (G1).** `getSpell` and `listSpells` have no caller in src. (a) keep and cut one case; (b) retire both in a separate task, removing four cases. I recommend (b).
- **Q-L2-12 (G5).** Add one generic null-session case to tests/graphql/loaders/index.test.ts and cut the five per-loader copies. I recommend (a), add and cut.
- **Q-L2-5 (O-I21).** Two compile-time checks inside test files. I recommend moving them to `*.type-check.ts` files, the existing pattern.
- **Q-L2-15.** Split invitation-acceptance.test.ts by entry point. I recommend the split.
- **Q-L4-4.** Split variants.test.tsx (action 1, about 44 s) or cut only ~6 cases. I recommend the split.
- **Q-L5-1.** Field/form-actions.test.tsx owns "Save disabled until dirty" and the spinner; each form's copy goes. I recommend that.
- **Q-L5-5.** Move three email-format rows from InviteDialog to a unit test of src/lib/email-address.ts. I recommend moving.
- **Q-L5-7.** Rebuild AppShell's add-ingredient menu on MenuButton, then cut four cases. A code change and a task of its own. I recommend the rebuild.
- **Q-L5-9, -10, -12, -13.** Add unit tests for `updatedColumn`, `isAtPath`, `matchesLabelOrGroup`, `opensElsewhere`, the `FALLBACK` branch of AdminNav/target.ts:30 and a test file for `ConfirmedAction`, then cut the parent rows that are their only proof. I recommend all of them.
- **Q-L5-14.** pending-link.tsx:31 restates `opensElsewhere`; import it instead and drop the test rows to one. I recommend the import.
- **Q-L6-3.** coven/[slug]/ingredients/page.test.tsx: mock the FacetPanel or walk the element tree (up to ~31 s local more). I recommend it.
- **Q-L7-4.** compendium-add.spec.ts:121 (5.8 s). I recommend deleting it.

#### Rule 3 and rule 4 cuts that need the owner's knowledge of a bug

- **Q-L4-1.** Markup-nesting checks at variants.test.tsx:1142 and duplicates.test.tsx:375 cite no bug. I recommend cutting them unless the owner names the bug.
- **Q-L5-2.** Modal :849, :864, :879 assert a CSS custom property from a faked `clientWidth`. I recommend moving them to an e2e spec.
- **Q-L5-3, -4.** `svg` markup comparisons in GroupForm :506/:558 and GroupedValueForm :329. I recommend cutting them.
- **Q-L5-6.** MenuButton :293 (Floating UI placement on mocked sizes). I recommend an e2e check instead.
- **Q-L5-8.** SignInPanel :236 (a happy-dom cookie quirk, no shipped bug cited). I recommend cutting it.
- **Q-L6-4.** cupboard.test.tsx:249's title names a role that does not exist. I recommend cutting it.

#### Small keep-or-cut questions

- **Q-L1-1.** Two CHECK-body catalogue reads with no behavioural partner. I recommend one behavioural row each.
- **Q-L2-1, -2, -3, -4, -6, -7, -14.** Soft-deleted-user copies (keep one per service file), user-list soft-delete (cut), received-invitations (keep :95, cut three), users-by-id per request (cut), the "Unknown argument createdBy" halves (leave), I1's six owner runs (cut), the trigram index-text check (delete). My recommendations in brackets.
- **Q-L4-2.** reference-panel.test.tsx:199's five kinds. I recommend keeping all five and dropping the order check in the loop.
- **Q-L4-3.** FacetPanel :256's scroll reset in happy-dom. I recommend keeping it.
- **Q-L4-5.** IngredientEntry bibliography cases also walked by story 64. I recommend keeping the component cases, since stories are not a required check.
- **Q-L4-6.** CompendiumList :754's 17.6 s with nothing that waits. I recommend a task to investigate.
- **Q-L5-11.** AccountMenu :71 or shell.spec.ts:153–162. I recommend keeping the e2e.
- **Q-L7-1.** The account page's two axe scans. I recommend deleting shell.spec.ts:295's 1280 px entry.
- **Q-L7-2.** navigation-wait.spec.ts:202 (a plain `<Link>` sets off the wait). I recommend keeping it.
- **Q-L7-5.** compendium-entry.spec.ts:118 promises 375 px and never sets it. I recommend folding it into :152.
- **Q-L7-7.** Three optional e2e merges (hover tests, skip-target, the 500 ms sleeps). I recommend all three.

### 10. Doc corrections owed (ride in the PR that makes each change)

- claude-docs/testing/where-tests-live.md:61–77 lists nine guards; tests/guards holds 19.
- claude-docs/testing/layer-ownership.md: add the page-test rule (§5 shape 1) and the rollback rule (shape 9); rule 8's list gains `bump_revision`'s sweep; rule 6's text or the sweep comment at workspace-isolation.test.ts:301 (the comment loses).
- claude-docs/tasks/v1/m13.md:195 and :197 (M13.15's criteria) to name the proofs that stay.
- The story count: 54 in DESIGN.md §10, 52 in acceptance.md and CLAUDE.md (L7-36).
- Stale spec headers naming deleted specs or denying a story that exists: compendium-entry.spec.ts:11–17, workspace-invitation.spec.ts:1–6, sign-in-configured-providers.spec.ts:7, shell.spec.ts:14, route-protection.spec.ts:8, workshop/click-feedback.spec.ts:7.
- tests/db/workspace-isolation.test.ts:268 and :323 say the grimoire services do not exist.
- e2e.md:15 or layer-ownership.md:111 (Q-L7-3).

### 11. How to package the work (one task per PR)

1. Seed test setup: actions 3, 4, 14, 15, 17 (tests/db/seed; no production code).
2. variants.test.tsx split (action 1) with its `VariantsField` harness.
3. CompendiumList filter split, CovenCards clock, the hover and 450 ms waits, armor.test.ts (actions 7, 10, timeouts table).
4. IngredientForm/index, IngredientEntry, Combobox, FacetPanel cuts (L4-2, -4 to -10).
5. Page tests: tests/app (L6 F-A to F-AB) and the request-session, pagination, lib cuts (F-AE to F-AR).
6. modules/ingredients sweep (L1) with the two new tests it needs first.
7. modules vocabulary, identity, coven, grimoire sweep (L2), including the eleven unended clients.
8. tests/db apart from seed (L3 F5–F15 and the M13.15 trims), with the m13.md correction.
9. The other components (L5), with the unit tests Q-L5-9/10/12/13 add.
10. e2e gate trims (L7-1 to -31), the shell.spec.ts flake fix and the stale headers.
11. CI split (§8), its own task.
12. Investigate CompendiumList :754 (Q-L4-6).
13. Guards to sorrel-lint (Q-L6-8), its own task, if chosen.

Each task's PR ends with a coverage run; nobody has run one over the cuts.

### Outcome

The audit's work landed as 13 pull requests into `staging`, #1270 to #1276 and
#1278 to #1283, all merged on 27 October 2026. #1277 merged in the same window
but is M13.16's autosave module, not this task, so the counts below leave it
out.

**Lines.** Measured against `staging` at `375b6842f`, with #1277's changes
excluded, the task deleted 19,123 lines under `tests/` and added 8,308, a net
10,815 fewer. Counting `tests/`, `src/` and the lint rules together, the net is
10,497 fewer.

**CI time.** The first gate run after the Vitest job was split into three
parts and a merge took 4 m 52 s for the required `vitest` check, against 6 m
34 s for the single job it replaced. The per-job times, and why `vitest-db`
and not `vitest-dom` is now the slowest part, are in
[`ci/runner-budget.md`](../ci/runner-budget.md), "Measured: the first gate run
of the split".

**What stayed by the owner's decision.**

- The three Modal cases that check the scrollbar-width custom property from a
  faked `clientWidth` (Q-L5-2) stay in Vitest rather than moving to an e2e
  spec.
- The `browser-floor` guard stays a Vitest guard rather than becoming a
  `sorrel-lint` rule (Q-L6-8).

**The closing PR** finished the task with five items:

1. `findManySpells`, an unpaged list of a coven's readable spells that nothing
   in `src/` called, is gone from the repository, with its row in the
   readable-spells matrix. The grimoire lists spells through
   `findPageInReadableSpells`, which `tests/db/repository/readable-spell-page.test.ts`
   proves under the same visibility rule.
2. A story that failed and then passed on its retry is listed as flaky, its box
   still unticked: the checklist line ends "flaky (failed, then passed on
   retry)" rather than "failing (flaky)". A pass on retry still does not count
   as a pass.
3. The shell gate case "a signed-in non-keeper meets the 403 inside the shell"
   is gone; its one assertion story 17 lacked, that the shell's bar and site
   navigation surround the 403 page, moved into story 17's first test.
4. The theme button at a 320 px window was checked by screenshot, signed in
   (`/account` and a coven page) and signed out (`/`). Nothing overflows:
   `document.documentElement.scrollWidth` is 320 on all three, the bar's disc
   sits inside the window and the corner disc meets its right edge, so the
   layout was left unchanged.
5. This section.

## A job-level `if:` renames the check only on the job that calls a reusable workflow

**Status:** decided, verified by two probes, adopted in MB.39 · **Date:** 2026-10-30

The rule this repo's CI filtering was built on said: a job-level `if:` makes GitHub report a differently named, bare check run, so no job may carry one. It had never been tested here. This record tests it. The result is split. The rule is **true for the job that calls a reusable workflow** and **false for a job inside the reusable workflow**. A matrix job cannot carry such an `if:` at all. A skipped check satisfies a required status check, and a required check that never reports blocks the pull request. MB.39 therefore moves the filtering of `vitest.yml`, `playwright.yml` and `checks.yml` onto job-level `if:` and splits `checks.yml`'s matrix into plain jobs.

A job-level `if:` is an `if:` key directly under a job, as opposed to under one of its steps.

### Verdict

| Question                                                                                       | Answer                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. An `if:` on the job that **calls** a reusable workflow (`uses:`) that evaluates to false    | **Verified.** One bare check run named after the calling job, `skipped`. No `caller / inner` check runs exist.                                                     |
| 2a. An `if:` on a plain job **inside** the reusable workflow, false                            | **Not true.** The check keeps its qualified name, `caller / inner`, with conclusion `skipped`.                                                                     |
| 2b. An `if:` on a **matrix** job inside the reusable workflow, written `if: matrix.should-run` | **Impossible.** GitHub rejects the file: `Unrecognized named-value: 'matrix'`. No check runs are created.                                                          |
| 3. Whether a `skipped` conclusion satisfies a required status check                            | **Yes.** A required check whose run is `skipped` leaves the pull request `CLEAN` (case A below). A required check that never reports leaves it `BLOCKED` (case B). |

What follows for the design:

- A skipped inner job keeps its normal name and satisfies a required check, so moving `if:` onto inner jobs is safe.
- A required check that never reports blocks the pull request. Leaving a matrix leg out of a `fromJSON` matrix would strand a required check, so that route is out.
- A matrix leg cannot skip itself with `if: matrix.*`. The route for `checks.yml` is a plain job per leg, each with `if: inputs.run-<leg>`.
- A job-level `if:` on a job that calls a reusable workflow still gives a bare check name. The only such `if:` in `pr-gate.yml` is the stand-down's (see "PR Gate's stand-down" below).

### Provenance of the claim

Traced from this repo's git history only.

| Commit      | Date       | What it did                                                                                                                                                                                                                                                                                                                   |
| ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1db422ab5` | 2026-09-09 | M0.16. Added the `lint`, `format` and `typecheck` workflows, each with a `should-run` input whose comment says a job-level `if:` gives "a differently-named, bare check run". The commit message says the workflows were copied from another repository with only a path fix. Nothing in it describes the symptom being seen. |
| `860d10f05` | 2026-09-09 | M0.20. Added `pr-gate.yml` with the "NO JOB HERE MAY CARRY A JOB-LEVEL `if:`" header and the same wording in `vitest.yml` and `playwright.yml`.                                                                                                                                                                               |
| `ecce1f1fe` | 2026-09-10 | Consolidated the working docs and wrote the rule into `claude-docs/ci/README.md` as a general rule ("A required-check job must never carry a job-level `if:`").                                                                                                                                                               |
| `2e7dcfe85` | 2026-09-17 | MB.32. Collapsed five check workflows into `checks.yml` and extended the sentence to matrix legs.                                                                                                                                                                                                                             |

None of this repo's three rulesets requires a status check today, so the symptom could not have been seen. The M0.16, M0.20 and MB.32 decision records are in the frozen archive, which is not read; the commits above are the trace.

### The probe

The probe ran on a throwaway branch `scratch/mb39-probe`, in a pull request into `scratch/mb39-base` (a copy of `staging`). `pr-gate.yml` triggers only on `main`, `staging` and `release/**`, and `deploy.yml` only on pushes to `main`/`staging` and pull requests into `main`, so only the probe fired on the pull request. All probe files and branches are deleted.

The first attempt put the matrix job and the plain jobs in one reusable workflow. GitHub refused the whole file (runs `41087836439` on push and `41087846275` on the pull request, both "This run likely failed because of a workflow file issue", no jobs, no check runs). The second attempt split the matrix job into its own file, which isolated the failure.

`mb39-probe-matrix.yml`:

```yaml
name: probe-matrix
on:
  workflow_call:
jobs:
  matrix-if:
    if: matrix.should-run
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - name: m-on
            should-run: true
          - name: m-off
            should-run: false
    name: matrix-if (${{ matrix.name }})
    steps:
      - run: echo ${{ matrix.name }}
```

`mb39-probe-plain.yml` (the `vitest.yml` shape: inputs, `if: inputs.*`; the two `control-*` jobs resolve the flag in a step, the current pattern):

```yaml
name: probe-plain
on:
  workflow_call:
    inputs:
      run-yes:
        type: boolean
        default: true
      run-no:
        type: boolean
        default: false
jobs:
  plain-yes:
    if: inputs.run-yes
    runs-on: ubuntu-latest
    steps:
      - run: echo yes
  plain-no:
    if: inputs.run-no
    runs-on: ubuntu-latest
    steps:
      - run: echo no
  control-yes:
    runs-on: ubuntu-latest
    steps:
      - if: inputs.run-yes
        run: echo yes
  control-no:
    runs-on: ubuntu-latest
    steps:
      - if: inputs.run-no
        run: echo no
```

`mb39-probe-caller.yml`:

```yaml
name: probe-caller
on:
  pull_request:
    branches: ['scratch/**']
jobs:
  call-if-true:
    if: true
    uses: ./.github/workflows/mb39-probe-plain.yml
  call-if-false:
    if: false
    uses: ./.github/workflows/mb39-probe-plain.yml
  call-plain:
    uses: ./.github/workflows/mb39-probe-plain.yml
```

### Raw output

#### Plain jobs: pull request run `41088026042`, head `083d601df03da3fa7d8a8b4ad0d185166231bb96`

`gh api repos/Aurora-Arctic/Sorrel-and-Salt/commits/083d601df03da3fa7d8a8b4ad0d185166231bb96/check-runs --paginate | jq -c '.check_runs[]|{name,status,conclusion}' | sort`:

```json
{"name":"call-if-false","status":"completed","conclusion":"skipped"}
{"name":"call-if-true / control-no","status":"completed","conclusion":"success"}
{"name":"call-if-true / control-yes","status":"completed","conclusion":"success"}
{"name":"call-if-true / plain-no","status":"completed","conclusion":"skipped"}
{"name":"call-if-true / plain-yes","status":"completed","conclusion":"success"}
{"name":"call-plain / control-no","status":"completed","conclusion":"success"}
{"name":"call-plain / control-yes","status":"completed","conclusion":"success"}
{"name":"call-plain / plain-no","status":"completed","conclusion":"skipped"}
{"name":"call-plain / plain-yes","status":"completed","conclusion":"success"}
```

Reading it:

- `call-if-false` (question 1) is one bare check run, `skipped`. The jobs inside never started, so none of them has a `call-if-false / ...` check run. A required check named `call-if-false / plain-yes` would never be reported.
- `call-plain / plain-no` (question 2a) is the inner job with a false `if:`. It keeps the qualified name and is `skipped`.
- `call-plain / control-no` is the step-level pattern in use today. It reports `success`, because the job runs and the step is skipped.
- `call-if-true / ...` shows a caller `if:` that is true leaves the normal names.

#### Matrix job: push run `41088014884`, same head

`gh api repos/Aurora-Arctic/Sorrel-and-Salt/actions/runs/41088014884/jobs` returned `{"total_count":0,"jobs":[]}`, and the check-runs call above lists nothing for `matrix-if`. The run's status is `completed`, conclusion `failure`, and `gh run view` says only "This run likely failed because of a workflow file issue". The error text is not in the REST API. It is on the run's public web page, `https://github.com/Aurora-Arctic/Sorrel-and-Salt/actions/runs/41088014884`, which reads:

```
.github/workflows/mb39-probe-matrix.yml#L1
(Line: 6, Col: 9): Unrecognized named-value: 'matrix'. Located at position 1 within expression: matrix.should-run
```

The `matrix` context is not available in `jobs.<job_id>.if`, because that expression is evaluated before the matrix is expanded into jobs.

### Question 3: the ruleset probe

A second scratch pull request tested whether a skipped check satisfies a required check. The ruleset write is the one step the `gh` token cannot do: creating a ruleset returned `gh: Resource not accessible by personal access token (HTTP 403)`, and a PUT returned `{"message":"Resource not accessible by personal access token",...,"status":"403"}`. The owner made the ruleset changes in the web UI instead. The UI form also added `deletion` and `non_fast_forward` rules, which do not affect the result.

Probe commit `1256d135282f050c9da6be3ea1398e69335dab98`, pull request #1346 into `scratch/mb39-base`, run `41091224592` (success). Ruleset `mb39-scratch`, id `26221065`, targeted `scratch/mb39-base` only. Read back: `"required_status_checks":[{"context":"call-plain / plain-no","integration_id":15368}]`.

Check runs on the head sha, the same in all three cases:

```json
{"name":"call-plain / leg (leg-on)","status":"completed","conclusion":"success"}
{"name":"call-plain / plain-no","status":"completed","conclusion":"skipped"}
{"name":"call-plain / plain-yes","status":"completed","conclusion":"success"}
```

| Case | Required check                                                                | Result                                                           |
| ---- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| A    | `call-plain / plain-no` (a plain job, `skipped`)                              | `{"mergeable_state":"clean"}` `{"mergeStateStatus":"CLEAN"}`     |
| B    | `call-plain / leg (leg-off)` (a matrix leg left out of the matrix, never ran) | `{"mergeable_state":"blocked"}` `{"mergeStateStatus":"BLOCKED"}` |
| C    | `call-plain / plain-yes` (a job that succeeded, the control)                  | `{"mergeable_state":"clean"}` `{"mergeStateStatus":"CLEAN"}`     |

Case B was read back as `[[{"context":"call-plain / leg (leg-off)"}]]`, case C as `{"updated_at":"2026-10-30T09:44:24.696-07:00","checks":["call-plain / plain-yes"]}`.

### What MB.39 changed

Part 1, in `vitest.yml` and `playwright.yml`:

- `vitest-dom`, `vitest-node` and `vitest-db` carry `if: inputs.should-run`. The merge job `vitest` carries `if: ${{ !cancelled() && inputs.should-run }}`, so it still runs after a failed part but not on a filtered-off run.
- The `playwright` job (now the `playwright-shard` jobs and the merge job `playwright`) carries `if: inputs.should-run`; the merge job's is `!cancelled() && inputs.should-run && !inputs.build-only`. The step-level `should-run` gating is gone from both files.
- Check names are unchanged (`vitest / vitest`, `playwright / playwright`). The only other caller of `playwright.yml` is `e2e-cache.yml`'s `warm` job, which relies on the default `should-run: true`.
- `playwright-coverage` reads only the `playwright` and `stories` results and outputs and uses `!cancelled()`. A skipped inner job leaves the caller's result `success` with empty outputs, so nothing breaks. Nothing `needs:` the vitest job.

Part 2, in `checks.yml`:

- The one matrix job is eight plain jobs: `lint`, `format`, `typecheck`, `codegen`, `build`, `destructive-ddl`, `migration-order` and `audit`. Each job's id and `name:` are the check name, so the check names are identical before and after, in the same order.
- `lint`, `typecheck`, `build`, `destructive-ddl` and `migration-order` carry `if: ${{ format('{0}', inputs.run-<leg>) != 'false' }}`. `format`, `codegen` and `audit` are not path-filtered and carry none. The `format()` wrapper makes an unset input (the empty string, as `act` leaves it) count as run.
- The `run-*` inputs and their defaults are kept, so `pr-gate.yml`'s call is unchanged. Nothing `needs:` `checks`.
- The steps every leg shares live in the composite action `.github/actions/run-check` (run, summarise, job summary, pull request comment). A composite action contributes steps only, so each job repeats the `container:` and `defaults:` preamble.
- Each job's `env:` is narrowed to what that job reads.
- `make act-check` runs `-j <leg>` instead of `-j check --matrix name:<leg>`.

`playwright-coverage.yml` and `gitflow.yml` still gate by step and are out of scope.

### PR Gate's stand-down

`pr-gate.yml` used to cancel its own `changes` run on a title or description edit, which left a cancelled `changes` and a cancelled `workshop` check run on the head commit, newer than the real run's successes, so the PR read as UNSTABLE (run `41097615379`). It now stands down: `changes` succeeds and sets a `stand-down` output, and every other job carries an `if:` on it, so each reports skipped. The finding above is what makes a caller-level `if:` safe here. A false `if:` on a calling job reports one bare name (`checks`) and never `checks / lint`, so it cannot overwrite a required inner name. A caller that ran with its inner jobs skipped would overwrite a real `checks / lint` failure with a skipped one, and a skipped required check passes, so no caller runs on a stand-down. A close's run stands down as well, since the other runs of the PR are cancelled by the group and a closed PR has no head commit to protect. Edits that retarget the base, and edits to a head commit no run has gated, still run the full gate. The `cancel-in-progress` expression is unchanged.

### Cleanup

- Pull requests #1345 and #1346 closed. `scratch/mb39-probe` and `scratch/mb39-base` deleted from `origin`; `git ls-remote --heads origin 'scratch/*'` prints nothing.
- The owner deleted the `mb39-scratch` ruleset. The rulesets diff against the list taken before is identical:

```
[{"id":22612570,"name":"Main"},{"id":22612931,"name":"Release Branches"},{"id":22612558,"name":"Staging"}]
```

- By `id`, `name` and rule `type` the three rulesets are unchanged: Main and Staging hold `deletion`, `non_fast_forward` and `pull_request`, Release Branches holds `deletion` and `non_fast_forward`. None of them requires a status check today.
- No live GitHub setting is changed.

## The CI images carry no source layer

**Status:** decided. Live home: `claude-docs/ci/composite-actions.md` and `claude-docs/docker.md`; the guard is `tests/guards/image-source-layer.test.ts`.

### Decision

- **Neither CI image carries source.** `Dockerfile.node` and `Dockerfile.e2e` copy in the manifests, run `npm ci` and stop; `headed` copies `Docker/playwright-entrypoint.sh` alone. Source arrives from outside: the `..:/app` bind mount in every compose service and the devcontainer, or `checkout-to-app`'s `cp -a` in CI.
- **`checkout-to-app` is checkout plus copy.** It has no clean step and runs no git in `/app`.
- **`tests/guards/image-source-layer.test.ts` allowlists each Dockerfile's `COPY` and `ADD` sources.** A new `COPY` is a decision recorded in the diff that adds it.
- **`/app` stays `node`-owned and vitest still runs as root in CI.** The guards `test-location`, `lint-db-client-boundary` and `slug-rule` keep `git -c safe.directory=*` for that reason.

### Why

An overlay never deletes. With `COPY . .` baked in and `cp -a` laid over it, every file dropped from the repo since the image was built stayed on disk in every container job, untracked and not ignored, and was linted, typechecked and globbed as if the branch had it. The source layer had one reader, CI, and it was the bug: every compose service bind-mounts over it. Removing the layer makes the stale file impossible rather than cleaned up after (the sweep-task rule's tell, `CLAUDE.md`, "Conventions"), and the ownership mismatch stops mattering to the action.

An edit to a composite action reaches a job only after a release carries it to `main`, since callers resolve it at `@main`. A Dockerfile change builds and runs its own image on its PR, because `pr-gate.yml` tags the image from `hashFiles('Docker/Dockerfile.node', 'package-lock.json')`.

### Rules out

- **Any source `COPY` in either image**, including `COPY src src`. The guard is an allowlist, not a `.` denylist.
- **Rebuilding the image per push.** It means hashing the source, so every push pays the `npm ci` the content-addressed tag exists to skip, to refresh a layer nobody reads.
- **A `git clean` step in `checkout-to-app`.** It has nothing to delete, and it would put git back in a `node`-owned `/app` under root.

## The CI Vitest job: DOM only where needed, GitHub's runner

**Status:** decided. Live home: `claude-docs/ci/runner-budget.md`, "Splitting the Vitest job" and "Why Blacksmith was dropped".

### Decision

- **The suite is not slow; where and how it runs is.** The `vitest` job took 2m47s on CI while the same run with coverage takes 14s in the devcontainer (12 cores, 11 workers). The fix is in the suite's setup and the runner, not the tests.
- **jsdom, jest-dom and React Testing Library boot only for files that need a DOM.** Of the 71 `unit` files at the time, nine needed one (the `.tsx` component and provider tests), plus two `.ts` files that need jsdom's `location`: `tests/lib/auth-client.test.ts` (Better Auth's client reads `window.location.origin` and `document.cookie`) and `tests/support/msw/graphql.test.ts` (relative `fetch('/api/graphql')`). A pure-node file that needs MSW (`tests/lib/mail.test.ts`) takes it explicitly.
- **No blanket `--no-isolate`.** It halves the unit project locally but breaks `tests/app/providers.test.tsx` (`vi.stubGlobal('window', undefined)` leaks through a shared module graph), and about 15 unit files use `vi.mock`, `vi.stubGlobal` or `vi.stubEnv`.
- **`tests/support/db-project.mts` pins `maxWorkers` for `db` only.** `unit` and `rsc` leave it unset and share the pool fine, so a new project leaves it unset too.
- **Job-level `cancel-in-progress: false` does not survive a workflow-level `true`.** The build jobs' protection never existed and is not needed: the image push is manifest-last and the cache export is per-blob, so a cancelled build leaves no tag and no index. `deploy.yml` (`false`, alias safety) and `migrate` (a lock) are right as they are.
- **Blacksmith was weighed for the `vitest` job and later dropped on cost** (3,000 free two-vCPU minutes per organisation per month, an 8-vCPU runner drawing 4× per minute). Moving Playwright or the image builds there was rejected, as it would have drawn about twice the free tier alone. GitHub's minutes on a public repo are free.

### Why

jsdom and its setup cost a boot per file for 59 files that never touch a DOM. The Actions cache sat at its 10 GB cap because the same blob digests were stored once per PR merge ref (a cache created for a merge ref can only be restored by re-runs of that pull request), crowding out the Next.js and npm caches; `build-db-image.yml` skips if the tag exists, so a post-merge build would write nothing anyway.

### Rules out

- A blanket `--no-isolate`.
- Relying on job-level `cancel-in-progress: false` under a workflow-level `true`.
- A runner billed against a per-organisation free tier shared with other repos.

## Each Playwright worker slot gets a server, not just a database

MB.112 was minted during M5.4, which held the e2e suite to one worker: every
server read one `sorrel_e2e`, and a spec file's reseed drops its database
`WITH (FORCE)`, so a reseed on a second worker cut the first's connections
mid-test, and two files starting together raced the same `CREATE DATABASE`.
Vitest has no such problem, because each pool slot clones a database of its
own. The owner asked the obvious question: can each Playwright worker just
swap `DATABASE_URL` in its setup, as Vitest does?

### Why a database each is not enough

Because the code under test runs somewhere else. In Vitest it runs in the
worker's own process: `tests/support/db-setup.ts` sets `DATABASE_URL` before
anything imports `src/db/connection.ts`, which builds its client at import,
so everything a test calls reads the worker's database. In Playwright the
worker runs only the spec and drives the browser; the app runs in
`next start`, which built its client from `DATABASE_URL` once, at boot.
Swapping the variable in the worker moves only what runs there —
`recreateE2eDatabase()` and `signInAs()` — so the worker would seed and sign
in to its own database while the page it opened read the server's. A
database per worker needs something on the server's side to match it.

### Decided

**A server per slot, declared up front**, the owner's choice.

The shape it took is [`testing/e2e.md`](../testing/e2e.md)'s; what follows is
why each part has the form it does.

- **`tests/e2e/slots.ts` holds the count and the ports**, and the count
  defaults to what a `workers` left unset would have given, so the switch
  from `--workers` changes nothing for a run that never set one.
- **The slot is `parallelIndex`**, read by a worker-scoped auto fixture, so a
  worker past the last server fails every test it runs — one that opens no
  page included — rather than reaching for a server nothing started.
- **Retries stay on one slot**, because the worker that replaces a failed one
  keeps its `parallelIndex`, and the reseed, the session and the pages all
  read it.
- **The configured-providers server takes 8100 and `sorrel_e2e_providers`**,
  which no spec reseeds. A fixed port above every slot's, with the 99-slot
  cap keeping the slots below it, means no slot reaches it — or, under a
  local `reuseExistingServer`, silently attaches to it, which a port counted
  on from the last slot would do whenever `E2E_WORKERS` rose between runs.
- **`devcontainer.json` still forwards 8001 alone.** The other ports are
  reached inside the compose network, which is where the remote browser runs.

### The data cache is per server too

Several servers over one build share the build directory, and one thing in
it is written at runtime. Next flushes its data cache — `unstable_cache`, the
compendium's — to `.next-e2e/cache/fetch-cache` and reads it back on a
memory miss, while `revalidateTag` reaches only its own process. Shared on
disk, one slot's server would serve another slot's cached compendium.
`next.config.ts` sets `experimental.isrFlushToDisk` from
`NEXT_ISR_FLUSH_TO_DISK`, which every e2e server sets to `'false'`, so each
keeps its data cache in its own memory. The flag also gates runtime ISR
writes and the image optimiser's disk cache; pages prerendered at build are
still read from disk. On Vercel it is off whatever the config says — Next's
build passes `false` under `hasNextSupport`, and a server in minimal mode
never flushes — so turning it off here moves e2e towards production rather
than away from it.

### Setup runs after the servers

This repo's comments and `../testing/README.md` said `globalSetup` ran before
`webServer` started. In Playwright 1.63 it does not: the runner's
`createGlobalSetupTasks` orders plugin setup — the `webServer` entries —
ahead of the global setups, and a throwaway config logged its server about
100 ms before its `globalSetup` ran. So `global-setup.ts` clones the slot
databases after the servers have booted, and before any test. That is enough
only because postgres.js connects on its first query, and the readiness
poll's `GET /`, carrying no session cookie, reads no database.

### What this rules out

- **`--workers` above `E2E_WORKERS`.** It fails, by design, rather than
  putting a worker on a port and a database nothing started.
- **A query at server boot, or in the readiness poll's path.** On a first
  run the slot databases do not exist until setup, which runs after the
  servers; such a query would need the databases cloned some other way first.
- **Request-controlled database selection in `src/db/connection.ts`.**

## The coverage provider, chosen by measurement

`npm run test:coverage` is the run CI times, and MB.180's slowest-files block
reads its per-file durations. MB.181's profiling found that v8 coverage roughly
tripled a dom file's time: `tests/components/IngredientForm/index.test.tsx` ran
12.3 s alone without coverage and some 40 s with it. So the budget was being
spent on instrumentation as much as on tests, and the question was whether the
other provider Vitest ships would spend less of it.

### The question

`@vitest/coverage-v8` collects V8's own coverage of everything a worker runs —
jsdom, React's development build and every other dependency included — and
remaps it onto `src/` through source maps when the run ends.
`@vitest/coverage-istanbul` instruments only the files `coverage.include`
names, at transform time, and leaves everything else running as it would with
no coverage at all. Neither is faster in general: istanbul's counters make each
line of `src/` slower to run, where v8's cost lies in collecting and remapping
code nobody measures. Which wins depends on how much of a worker's time is
spent outside `src/`, and in a suite whose slowest files render through jsdom
that is a measurement, not a known answer.

### Local numbers

#### Time

| Run         | Wall    | Summed  | dom     | db      | unit   |
| ----------- | ------- | ------- | ------- | ------- | ------ |
| v8-1        | 116.3 s | 265.1 s | 154.3 s | 97.1 s  | 13.6 s |
| istanbul-1  | 74.5 s  | 194.5 s | 87.5 s  | 92.9 s  | 14.0 s |
| v8-2 ✗      | 119.3 s | 285.7 s | 147.2 s | 124.3 s | 14.1 s |
| istanbul-2  | 71.7 s  | 190.7 s | 89.1 s  | 87.0 s  | 14.7 s |
| v8-3        | 103.7 s | 239.5 s | 136.8 s | 90.1 s  | 12.5 s |
| istanbul-3  | 76.7 s  | 210.3 s | 82.1 s  | 114.3 s | 13.9 s |
| no coverage | 69.7 s  | 178.8 s | 87.6 s  | 79.9 s  | 11.3 s |

| Mean of the clean runs | Wall    | Summed  | dom     | db     |
| ---------------------- | ------- | ------- | ------- | ------ |
| v8 (2 runs)            | 110.0 s | 252.3 s | 145.6 s | 93.6 s |
| istanbul (3 runs)      | 74.3 s  | 198.5 s | 86.2 s  | 98.1 s |
| no coverage (1 run)    | 69.7 s  | 178.8 s | 87.6 s  | 79.9 s |

Istanbul took 32 % off the wall and 21 % off the summed time. The saving is
all in `dom`, which fell by 41 % to what it costs without coverage; `db` and
`unit` are level within the noise between runs. Istanbul's own price shows in
Vitest's breakdown, where `transform` rises from 4 % to 8 % of the run.

#### Slowest files

The ten slowest files of v8-1 and istanbul-1, the first pair:

| v8-1                                                           |        | istanbul-1                                                      |        |
| -------------------------------------------------------------- | ------ | --------------------------------------------------------------- | ------ |
| `tests/components/IngredientForm/index.test.tsx`               | 85.5 s | `tests/components/IngredientForm/index.test.tsx`                | 44.3 s |
| `tests/components/IngredientForm/references.test.tsx`          | 19.0 s | `tests/components/IngredientForm/references.test.tsx`           | 11.1 s |
| `tests/components/IngredientForm/compendium.test.tsx`          | 10.9 s | `tests/components/IngredientForm/compendium.test.tsx`           | 6.3 s  |
| `tests/db/seed/standard.test.ts`                               | 8.1 s  | `tests/modules/ingredients/services/common-names-plan.test.ts`  | 5.9 s  |
| `tests/db/seed/demo.test.ts`                                   | 6.2 s  | `tests/db/connection-budget.test.ts`                            | 5.8 s  |
| `tests/components/Combobox/index.test.tsx`                     | 6.2 s  | `tests/db/seed/standard.test.ts`                                | 5.6 s  |
| `tests/db/connection-budget.test.ts`                           | 5.9 s  | `tests/db/seed/demo.test.ts`                                    | 4.6 s  |
| `tests/modules/ingredients/services/common-names-plan.test.ts` | 5.2 s  | `tests/app/api/graphql/route.test.ts`                           | 3.6 s  |
| `tests/components/GroupForm/index.test.tsx`                    | 4.5 s  | `tests/components/Combobox/index.test.tsx`                      | 3.5 s  |
| `tests/db/seed/sources.test.ts`                                | 3.7 s  | `tests/modules/ingredients/services/compendium-entries.test.ts` | 3.4 s  |

`IngredientForm/index.test.tsx` across every clean run: 85.5 s and 76.7 s under
v8, 44.3 s, 42.2 s and 41.1 s under istanbul, and 45.7 s with no coverage. It
is still the run's wall clock under either provider — these are full parallel
runs, where MB.181's 12.3 s was the file alone — so the switch does not bring
it under the 10 s budget, and MB.181's split still has to. v8-1 had three
files over the budget, and istanbul-1 two.

#### Coverage

The totals were identical across every run of the same provider.

| Provider | Statements               | Branches                 | Functions                | Lines                    |
| -------- | ------------------------ | ------------------------ | ------------------------ | ------------------------ |
| v8       | 97.31 % (5,147 of 5,289) | 92.41 % (3,206 of 3,469) | 98.84 % (1,625 of 1,644) | 98.84 % (4,550 of 4,603) |
| istanbul | 97.24 % (5,110 of 5,255) | 92.36 % (3,204 of 3,469) | 98.84 % (1,626 of 1,645) | 98.77 % (4,513 of 4,569) |

The 80 % threshold holds on every metric under istanbul, with the same 22
files under 80 % on some metric as under v8. Per file:

- **Statements** differ in 21 files and **lines** in 7, each by under four
  points. Nineteen of the 21 are client components: v8 counts a file's
  `'use client'` directive as a statement, always covered, and istanbul does
  not, so each has one covered statement fewer. That is 40 of the 43 client
  files, most of them at 100 % either way; a handful of other files differ by
  a statement in either direction, for a net 34 fewer in the total.
  The other two are services. In
  `src/modules/ingredients/services/workspace-ingredients.ts`, istanbul counts
  the `break` after each `refuse(...)`, a call that always throws, where v8
  marks it covered with the block around it, so the file goes from 100 % to
  96.72 % of statements; `src/modules/ingredients/services/compendium.ts`
  loses one statement the same way.
- **Branches** differ in 2 files: `src/components/IngredientForm/suggestions.tsx`
  (93.61 % → 91.48 %) and `src/lib/citation.ts` (89.53 % → 88.37 %), each one
  branch fewer covered.
- **Functions** do not differ in any file.
- **Files listed**: v8's summary lists 285 files, istanbul's 232. The 53 it
  omits have nothing to measure — 46 `types.ts`, six barrel `index.ts` files
  and `src/lib/session.ts` — and `coverage-table.mjs` already filtered them
  out of the PR comment.

`.reports/coverage/coverage-summary.json` keeps its shape: the same `total`
key, absolute file paths as keys, and `total`/`covered`/`skipped`/`pct` per
metric. `summarize-vitest.mjs`, run on a copy with its `/app` paths pointed at
the istanbul output, wrote the stat line, the coverage table and the
slowest-files block as it does under v8. With the provider switched in the
config and no override, the verification run took 73.3 s and gave the same
totals.

### Decision

**Istanbul.** `vitest.config.mts` names it, `@vitest/coverage-v8` is
uninstalled — nothing else referenced it, and Vitest lists both providers as
optional peers — and `@vitest/coverage-istanbul` is installed at the
`vitest` version. It is faster on wall and on summed time in every pair, it
costs the run about five seconds over no coverage at all where v8 cost forty,
and it holds the threshold with room to spare.

Nothing else needed changing for it: `coverage.include` and `exclude` mean the
same to both providers, and no file in `src/` or `tests/` carries a `v8 ignore`
comment that would need to become `istanbul ignore`.

### What this changes for later tasks

- **Per-file baselines restart here.** A consolidation PR compares per-file
  coverage against the previous run's summary
  ([`testing/layer-ownership.md`](../testing/layer-ownership.md), "How a
  consolidation PR shows its work"); a v8 figure from before this PR is not a
  baseline for an istanbul one, because the two count statements and branches
  differently. This PR's CI run is the new baseline.
- **MB.189's closing measurement** is taken under istanbul.
- **The 10 s budget** in `.github/scripts/lib/slowest-files.mjs` is unchanged;
  it was set from v8 figures, and the files it named are still over it.

### CI's numbers

Every number above is local. The acceptance criteria ask for summed worker
time, Vitest's wall and the slowest-files block under each provider from CI's
own runner, and those belong in this task's PR body, beside the PR's own CI
comment, which carries the coverage table and the slowest-files block under
istanbul.

## Cut the test suite to functional requirements

**Status:** decided. Live home: `claude-docs/testing/layer-ownership.md`, "What a test may assert" and "The owning layer"; `.claude/rules/testing.md`, "What a test asserts"; `claude-docs/testing/coverage.md`.

### Decision

A test proves a behaviour a user, admin or operator depends on, by the state it leaves. Ten rules follow from that.

1. Functional requirements only. No tests of the harness, CI YAML, docs, scripts, the Dockerfile or `package.json` wiring, and none for code only Claude agents run (`scripts/task-board.mjs`, the doc and citation tools, the CI summarisers).
2. State, never copy. Assert the status, alert, row or chip, not a heading, label, placeholder, empty-state sentence, email subject or the sentence of an error whose kind (`Forbidden`, `extensions.code`, zod `path`, `reason`) is already asserted. The one exception: the words are the state when nothing else tells two outcomes apart, such as which of two lock reasons won. Locators keep exact names.
3. A regression test needs a bug that reached a PR or production, and cites it. A bug caught while building gets none, and neither does "X stays removed".
4. No presentation in jsdom: no class name, custom property, z-index, compiled-Sass value or faked layout. The workshop story and the Playwright axe scan own presentation. A real browser measuring a layout requirement, and one token-contrast check per theme, are allowed.
5. One row per shared path. A `describe.each` over a component's or module's own config table runs the shared behaviour on one row; every other row gets only what it changes. A fixed list is proven by one accepted value, one refused, and one equality check of the database's list against the code's.
6. Each layer proves only what it adds. A service refusal is asserted once, as one non-keeper fixture with its precondition, when the check reads only the site role. A GraphQL file never re-tests the service, the scope sweep or signed-out callers. A module validation test asserts only what its schema adds over `src/lib/validation.ts`. A page test holds the guard, its search params reaching the service, and its modal close href; Pager owns paging.
7. A migration's data tests retire once the migration is in production's journal; the shape tests of the resulting tables stay.
8. No guard test for a rule lint can carry. Import bans, `server-only`, `'use server'`, route allowlists, slugify and type-only files are oxlint rules (`.oxlintrc.json`, `lint/sorrel-lint.js`). A Vitest sweep stays only where it reads the schema, the catalogue or the module graph.
9. e2e proves what only a real server can: navigation, server render, cookies, mail, cache, the production build's config, one axe scan per page. A spec never re-runs a flow a component or service test proves wholesale; each admin page keeps its 403 and one flow.
10. SQL text appears only as the precondition of an EXPLAIN plan test, and plan tests keep their row counts.

Never deleted, whatever the tables say: one direct-id refusal with its precondition per service rule; soft-delete, scoping, identity and visibility rules; the behavioural test of a DB CHECK or partial unique index (once); `tests/db/audit-columns.test.ts`'s catalogue half; `tests/acceptance/` (loosened, never removed); any locator. Dead code (fixtures, constants, helpers) goes with its last reader. A test whose title names a deleted thing is retitled to the behaviour.

### Why

A copy, class or memorial test adds no coverage of behaviour and costs a CI-minute on every run. The 80% threshold exists partly to keep tests on functional requirements.

### Rules out

- Trimming e2e past duplicates: the owner chose to trim only duplicates.
- A Vitest guard for anything lint can enforce: lint fails at edit time and a guard only at CI.
- Per-role A, B, C and D refusal rows where the check reads only the site role: they pin nothing the one non-keeper row does not.

## Gate-time reductions not taken

**Status:** decided. Live home: `claude-docs/ci/runner-budget.md`.

### Decision

- **Reductions are ordered by seconds off the gate per hour spent**, each its own task and PR, with the before and after recorded from the PR's gate run in the task entry and `claude-docs/ci/runner-budget.md`.
- **Not taken:**
  - **Builds or Playwright on Blacksmith** (`claude-docs/ci/runner-budget.md`, "Why Blacksmith was dropped"). Revisit only if the free tier is raised or Playwright grows past about 5 minutes.
  - **Merging the seven small `checks` legs into one runner:** saves about 150 s of free GitHub minutes per run and changes every check name, with no gate-time gain because they run beside Playwright.
  - **Sharding Playwright across runners:** rejected at 56 tests, where the pull and build were fixed costs each shard would repeat. **Taken once the gate suite reached 563 tests** (three shards, stories two): an extra shard repeats about 3 minutes (about 94 s outside the test step and about 81 s of server start inside it) and removes about 4 minutes of test time, and the runners are free. See `claude-docs/ci/runner-budget.md`, "Playwright shards".

### Why

Each rejected option costs more than it saves in gate time.

### Rules out

- Renaming checks for minutes that are free.

## Oxlint rules that are errors

**Status:** decided. Live home: `claude-docs/commands.md`, "The app" (the error and warning split, with a reason for each).

### Decision

- **Selected rules are `"error"` in `.oxlintrc.json`**, so CI and pre-commit refuse a new hit. Every other rule stays a warning, and there is no blanket `--deny-warnings`.
- **Errors:** `no-unused-vars`, `no-console` (the `scripts/**` override is extended to `.design-sync/**` and `.github/scripts/**`), `no-unsafe-optional-chaining`, `react-hooks/exhaustive-deps`, `react/set-state-in-effect`, the jsx-a11y interaction rules (`click-events-have-key-events`, `no-static-element-interactions`, `no-noninteractive-element-interactions`, `interactive-supports-focus`, `no-noninteractive-tabindex`) and the jsx-a11y label and anchor rules (`control-has-associated-label`, `anchor-is-valid`).
- **Warnings:** `react/refs`, `react/immutability`, `jsx-a11y/prefer-tag-over-role`, and `jsx-a11y/aria-role` with `ignoreNonDOM: true`. The React Compiler rules (`react/globals`, `react/preserve-manual-memoization`, `react/incompatible-library`) warn in `src/` and are off in the `tests/**` override with `react/refs` and `react/immutability`.
- **A rule made an error must also hold in the `tests/**`, `.storybook` and `scripts/**` overrides**, unless an override turns it off on purpose.

### Why

A rule that only warns is enforced by nothing. The advisory rules are the ones the compiler being off makes noisy.

### Rules out

- `--deny-warnings` across the board.
