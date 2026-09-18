# CLAUDE.md

Guidance for Claude Code working in this repository.

`claude-docs/DESIGN.md` is the specification and `claude-docs/TASKS.md` is the work breakdown. It is corrected in place when it is wrong — "frozen" means not re-scoped, not never-corrected. Its **Execution order** section, not its milestone numbering, is the schedule: task IDs are immutable identifiers and several milestones deliberately execute split across waves. This file carries the rules that apply to _every_ task; the section references below (§n) point into `DESIGN.md`, and milestone references (M0.1) into `TASKS.md`. When this file and the design doc disagree, the design doc wins — and fix this file.

---

## Vocabulary

Three domain nouns, each meaning exactly one thing. Use them consistently in routes, components, tests, commits, and conversation.

| Term            | Meaning                                                      |
| --------------- | ------------------------------------------------------------ |
| **Compendium**  | The global, admin-curated ingredient reference. What exists. |
| **Ingredients** | A workspace's own ingredients and stock. What you have.      |
| **Grimoire**    | A workspace's spells. What you make.                         |

Never write "catalog" — it was the old word for the compendium and it is gone.

The schema entity is `workspaces`; the URL prefix is `/coven/`. This divergence is deliberate (§5). Code, schema, and prose say _workspace_. Only the URL segment says _coven_.

---

## Commands

`make help` lists every target — from the **host**. Neither `make` nor `docker` is installed in the devcontainer, so a session running inside it calls the npm scripts directly; the `make` column below is the host equivalent.

**There is no Python in the devcontainer.** Neither `python3` nor `python` exists — reaching for one to do quick scripting, JSON munging, or arithmetic fails with `command not found`. Use Node (`node -e`), the npm scripts, or plain shell tooling (`jq`, `grep`, `sed`) instead.

| Command                                                                                                        | Purpose                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev` (`make dev`)                                                                                     | Next.js dev server on **8000**                                                                                                                     |
| `npm run build` / `start` (`make build` / `start`)                                                             | Production build; e2e runs it on **8001**                                                                                                          |
| `npm run lint` / `format:check` / `typecheck` / `check:stories` / `check:theme-default` (`npm run pre-commit`) | The pre-commit checks                                                                                                                              |
| `make docker-up`                                                                                               | App + Postgres 18 locally, no Neon connection needed                                                                                               |
| `make docker-workshop`                                                                                         | Also brings up the Ladle workshop, on **61000**                                                                                                    |
| `make docker-studio`                                                                                           | Also brings up Drizzle Studio, on **4983**                                                                                                         |
| `make docker-all`                                                                                              | App + Postgres + workshop + studio + the Playwright browser server (`:7900`, MB.23), all at once — `e2e` itself stays opt-in via `make docker-e2e` |
| `npm run workshop` / `workshop:build` (`make workshop` / `workshop-build`)                                     | Ladle component workshop on **61000**; `:build` is the static export, wrapped so a story that fails to bundle actually exits non-zero              |
| `npm run db:studio` (`make db-studio`)                                                                         | Drizzle Studio on **4983**, browsing the local database via `drizzle.config.ts`; UI is `https://local.drizzle.studio`                              |
| `make act-check` / `act-destructive-ddl`                                                                       | Run a check locally via `act`; `act-check CHECK=<leg>` picks a `checks.yml` leg, `make act-test` chains four                                       |
| `npm run dev:debug` (`make dev-debug`)                                                                         | Next.js dev server with the Node inspector on **9229**; see [`claude-docs/debugging.md`](claude-docs/debugging.md) for the full debugging setup    |
| `npm run db:generate` / `db:migrate` (`make db-*`)                                                             | `drizzle-kit generate` / `migrate`, wired in M1.3                                                                                                  |
| `npm run db:seed` / `db:reset` (`make db-*`)                                                                   | Wired, but `seed()` throws for every scenario until M1.21–M1.23 fill them in, so `db:reset` fails at its seed step                                 |
| `npm run codegen`                                                                                              | **Not wired up yet.** Exits non-zero until M3.5 wires it to graphql-codegen                                                                        |
| `npm run test:coverage`                                                                                        | `vitest run --coverage` — `unit` (jsdom) + `db` (node/Postgres) projects, 80% threshold                                                            |
| `make test-stories`                                                                                            | **Doesn't exist yet.** Arrives in M1.28 — acceptance suite only, prints a pass/fail line per user story                                            |

**Verify with `test:coverage`, not `test`.** A plain `npm run test` pass can still fail CI on the 80% threshold (lines, branches, functions, statements) alone.

**Deploys are CI-only (M0.26).** `.github/workflows/deploy.yml` deploys via the Vercel CLI (`vercel pull`/`build`/`deploy --prebuilt`/`alias`) on a push to `main` (production) or `staging` (preview → `staging.sorrelandsalt.com`), and on a `hotfix/** → main` PR (preview → per-PR `hotfix-<slug>.sorrelandsalt.com`, commented on the PR, torn down on close). `vercel.json` sets `deploymentEnabled: { "**": false }` — Vercel's Git integration deploys nothing; the workflow is the only path. There is no local deploy command.

---

## Non-negotiable architecture rules

**1. Authorization lives in `src/services/`. Never in resolvers, never in pages.**
Server components call services directly (wrapped in React `cache()`); everything the browser initiates — every mutation, and every read without a navigation — goes through `/api/graphql`. Two transports, one set of rules, because both end at the same service function. There is no third access path: no server actions, no bespoke route handlers, and admin is not an exception (M3.8).

**2. Only `src/db/repository.ts` may import the database client.**
M1.17's `no-restricted-imports` rule enforces it — a new importer fails `npm run lint`. Three files are exempt besides the repository, each by a named `oxlint-disable-next-line` at the import and each because it needs a client rather than a writer: `src/lib/auth.ts` (Better Auth's `drizzleAdapter`), `scripts/db-seed.ts`, and `src/db/test-database-isolation.test.ts`. That set is pinned by test — a fourth exemption is a decision, not a convenience. M3.9 still has to add the rule that stops `src/graphql/**` and `src/app/**` importing the _repository_; until it lands that half holds by convention. Either way they reach services and nothing below.

**3. All writes go through `withAudit(session, fn)`.**
`withAudit` opens the transaction, injects the audit ids from the _session_ (never from a request body), and publishes the acting user to the database as a transaction-local GUC — `select set_config('app.current_user_id', $1, true)`, not a literal `SET LOCAL`, which accepts no bind parameters and would mean interpolating a user id into SQL text. Every table carries the six-column `...auditColumns` spread, join tables included. The GUC has no reader in v1 and is published anyway: it is what makes the v2 history trigger, and policies when they land, one migration rather than a re-audit of every write path. **Reads open no transaction of their own** — a read carries identity in rule 5's `Membership` proof, which is a compile-time argument rather than a session variable, so there is no read-side counterpart to `withAudit` and nothing for it to nest with.

**4. Soft-delete filtering happens in the repository, never at call sites.**
No exported finder can return a `deleted_at IS NOT NULL` row. Every unique index is partial (`WHERE deleted_at IS NULL`) — without it, deleting a record permanently reserves its name. Nothing outside the database layer may import `drizzle-orm` at _runtime_ (MB.33): a query cannot be built without that import, so the same `no-restricted-imports` entry rule 2 uses makes a call-site query unbuildable rather than merely unreviewed. `import type` stays legal everywhere, which is how the GraphQL layer names Drizzle types (§7).

**5. Two authorization layers, deliberately: the service check, and the `Membership` proof it returns.**
`assertMembership(session, workspaceId, minRole)` runs in the service and returns a branded `Membership` — `{ workspaceId, userId, role }`, unconstructible anywhere but the membership service. Every workspace-scoped repository finder and `AuditWriter` method takes that proof as its first argument and ANDs `workspace_id = membership.workspaceId` onto the query itself; `write.insert` fills the column from it. The layers look redundant, and that is the point: the first is the check, the second makes a workspace-scoped query _unwritable_ without having passed it. Impossible, not merely absent — the sweep-task rule's own test — and erased at compile time, so it costs nothing at runtime. M6.3 builds it; M10.3 applies the same shape to spell `visibility`.

Where it is weaker than a database policy, say so rather than gloss it: a service holding a valid proof for W that hand-writes a `where` naming X's ids is not caught by the type, and `spell_ingredients` / `spell_categories` carry no `workspace_id`, so their services load the parent spell under the proof first. Both are covered by the direct-id denial tests the Testing section already requires, and by M6.6.

**RLS is deferred to the public launch, not rejected** (MB.29, DESIGN.md §14). `withAudit` keeps publishing `app.current_user_id` on every write, so adding policies later is one migration plus its tests. The specification for that migration — the role split, `FORCE`, the `security definer` helper, and why a policy test connected as the table owner proves nothing — is [`mb.24-rls-role-split.md`](claude-docs/design-decisions/mb.24-rls-role-split.md), superseded as a plan for v1 and intact as a plan for then.

**6. Never cache anything not keyed by viewer identity.**
The compendium and categories are cacheable (`unstable_cache`, tag `compendium`, `revalidateTag` on every admin mutation). Anything workspace-scoped is not.

**7. Filter in SQL, not after fetching.**
A private spell must never reach a resolver. Same for cross-workspace rows.

**8. Every list paginates through the M3.6 cursor helper.** Default 25, hard server maximum 100, cursors encode sort key + id and never an offset.

**9. DataLoader is not optional.** Compute has a dollar cost on Vercel, so an N+1 is a billing bug as well as a slow one. Loaders are constructed per request, never at module level.

**10. Migrations are expand/contract and forward-only.** No down migrations exist in this repo. Destructive DDL (DROP, RENAME, type narrowing, NOT NULL additions) needs an explicit acknowledgement line in the PR body; M1.5 adds the CI check that flags it.

---

## Domain invariants that are easy to get wrong

- **The site is invite-gated.** Signing in with Google or GitHub earns an account and _nothing else_. `canCreateWorkspace` defaults to `false` and turns true only by accepting an invitation (M7.5) or an admin grant (M5.8). Once true it stays true. Nothing in the OAuth flow sets it.
- **There are no personal workspaces.** No `kind` column; every workspace can take members and be deleted by an owner.
- **Admins curate the compendium, global categories, the ingredient form vocabulary, and the two group vocabularies that organise them — and nothing else.** A site admin has no access to any workspace's ingredients or grimoire — asserted by test (M6.6). `category_groups` and `ingredient_form_groups` are tables rather than enums precisely so an admin can add one without a migration (MB.35, §5); a category group carries `colorDark` and `colorLight` as hexes on the row, each contrast-checked on write against its own theme's ground, because a group created at runtime cannot have a build-time Sass token. Groups list alphabetically by name — there is no order column.
- **An ingredient's identity is its formal name and its form.** `canonicalKey` is `lower(coalesce(canonical_name, name))` plus the normalised `form`; `name` is only what the ingredient is called _here_ and is freely relabellable, because identity moved off it. The compendium declares a `nomenclature` for every entry — `none` and `unknown` are answers, not absences, the same way `unitConvert` refuses rather than guesses. `ingredients.form` is text, **not a foreign key**: the curated vocabulary is an autofill, so an uncurated value stays writable. Local-beats-compendium resolution matches on identity, falling back to the label only when the local entry declares no formal name. Common-name and form lookups suggest from the compendium and the current workspace only — never another workspace, and that scoping covers the suggested strings themselves, not just their attribution.
- **Invitations grant `viewer` or `member` only.** A DB check constraint rejects `owner`. Ownership is granted afterwards by an existing owner on the members page.
- **Spell visibility widens only.** `private → workspace` is allowed; `workspace → private` is rejected with an explaining error, not a bare `Forbidden`. Widening is a gift, narrowing is a retraction. Enforced in the service and asserted by test — not merely absent from the UI. The rule governs visibility, not existence: a shared spell can still be deleted.
- **Viewers write nothing.** With notes deferred to v2, there is no exception.
- **Unit conversion is within one dimension only.** weight↔weight and volume↔volume; anything crossing dimensions, and anything involving `count`, is refused as an explicit result the caller must handle — never null, NaN, or a guess. **No density table exists anywhere in the codebase.**
- **Two kinds of spell category.** Assigned categories are what the spell _intends_; derived categories are the union of its ingredients'. Conflating them is a bug.
- **Invitation tokens** use `crypto.randomBytes()`, never `Math.random()`. Only the hash is stored; the URL is returned once, in the mutation response.
- **`/admin` returns a styled "not authorized" page** to a signed-in non-admin. `/coven/[slug]` returns **404** to a non-member — workspace existence is private, `/admin` is a path everyone already knows.

---

## Testing

TDD throughout: write the failing test, watch it fail, write the minimum, refactor. Each wave opens with an acceptance-test scaffold PR that intentionally lands red — anchored to the wave rather than the milestone, since a milestone no longer opens as a block.

- **Tests never touch Neon.** Neon is deployment-only. Local Postgres 18 in Docker everywhere else — SQLite cannot run PL/pgSQL triggers, `num_nonnulls` constraints, `pg_trgm`, or array columns, which are exactly what needs testing.
- Each Vitest **`db`-project** worker clones `sorrel_test_${VITEST_POOL_ID}` from the baked `sorrel_template` — the pool _slot_, never `VITEST_WORKER_ID`, which counts test files rather than workers and so runs past the set of clones that exist (MB.14); the `unit` project gets no such rewrite and sees the plain `sorrel` database, so anything touching Postgres belongs in `db`. Playwright uses `sorrel_e2e`. Do not wrap tests in a rolled-back transaction — `withAudit` opens its own, and `SET LOCAL` would leak one test user's identity into the next assertion.
- One seed module (`src/db/seed/index.ts`), three consumers (Docker, Vitest, Playwright), three scenarios: `minimal`, `standard`, `demo`.
- Fixture users: **A** owner of W · **B** member of W · **C** viewer in W · **D** member of unrelated X · **E** site admin in no workspace. `asUser(A)` gives a session; services throw `Forbidden`.
- Acceptance tests name their story (`describe('Story 12: ...')`) so a failure points at a requirement. Acceptance coverage is tracked separately from the 80% line threshold — they measure different things.
- **Accessibility is asserted in Playwright** via `@axe-core/playwright`, not `vitest-axe`.
- Component tests use role and label queries only. No test ids for anything a user can see.
- **No snapshots** except design tokens and the GraphQL SDL.
- Bug fixes start with a regression test.
- Authorization tests must assert **direct-id** access is refused, not merely that a row is absent from a list.
- **An authorization test must also assert why the access could have succeeded.** "No rows came back" has several causes and only one of them is the guard working — the fixture was empty, the finder was never reached, the id was wrong. Assert the preconditions, not just the outcome. A test that would stay green with the guard removed proves nothing, so prove it fails without it.

---

## Conventions

- **One task per PR.** Do not combine tasks, even small adjacent ones. A task is sized to one sitting and reviewable in one — most land in 1–2h, and a bigger one says so in its own entry rather than being split for the sake of the number. A sub-hour fix noticed while doing a task rides in that task’s PR and is named in its body; it does not get an `MB` id (MB.31).
- **A table task, then a behaviour task.** Never bundle `CREATE TABLE` with the policy or service that governs it. DDL is fully specified by §5, is inert until something queries it, and is cheapest to constrain while the table is empty — so it lands early. Policies and services carry the real uncertainty and must be written against each other, so they land late. The unit of dependency is the task, not the milestone; treating the milestone as the unit is what produced the original ordering bug.
- **The sweep-task rule.** A sweep that attaches to **database objects** lands once, immediately after the last object it covers, protected by a catalogue-introspection test — never by a later "re-assert" task. A sweep that attaches to **code** lands as a mechanism plus a mechanical guard, as early as the mechanism can be written, and is adopted by each later task in that task's own PR — never retrofitted. The tell: can the thing be made _impossible_, or only _absent_?
- A task is done when every acceptance criterion is demonstrably met — not when the code appears to work.
- **Port, don't rewrite from memory.** The source repo for all ports is `resume-2026`.
- **Components:** `src/components/<Name>/` with `index.tsx`, `index.scss`, `index.test.tsx`, imported `from '../components/IngredientCard'`.
- **Every standalone component ships an `index.stories.tsx`** in the same directory — no exceptions; the Ladle workshop discovers components by that file. `check:stories` catches a missing story, `workshop:build` catches one that fails to bundle, and both run in pre-commit **and** in CI's build job, so a PR can't skip either by skipping the local hook. The gate is scoped to `src/components/`; `.ladle/*.stories.tsx` is the one non-component location. Stories carry no test ids and no snapshots. Detail: [`claude-docs/workshop.md`](claude-docs/workshop.md).
- **Sass:** modern module system only — `@use '../../scss/variables' as *;`, never `@import`. Shared partials in `src/scss/` are `@use`'d directly by whichever component needs them, never routed through a parent.
- **The design will change.** Do not build component styling beyond the tokens (M0.7) and mixins (M0.8).
- **No print styles anywhere except the spell recipe view** — the page is MB.6, the print layout is M10.22. `_print.scss` is created by M10.22 and scoped to that one view.
- Gitflow: `feature/*` → `staging`; `staging` → `main` via `release/MAJOR.MINOR.PATCH`; `hotfix/*` opens both; `main-sync/YYYY-MM-DD-HH-MM-SS` brings `main` back down. Staging carries the same protections as production; local development is the only relaxed environment.
- Document as you go in `claude-docs/` — a summary per subsystem, one doc per component. Several tasks name it as an acceptance criterion. [`claude-docs/README.md`](claude-docs/README.md) describes the layout.
- **Correct a doc in the PR that makes it wrong** (MB.31). There is no scheduled compression pass: a statement goes stale in a particular diff, and that diff is where it is cheapest to fix and hardest to forget. `MW.15` is the one remaining pass — the v1 close-out, and the third to run rather than the sixteenth. Decision records in `claude-docs/design-decisions/` stay live and are superseded in place. `claude-docs/archive/` is frozen as it stands: write-once, never read, and nothing new goes into it.
  - **The test is "is this statement out of date?", not "is this narrative?"** Two things are never cut for being old: a forward-looking rule that still binds later work, and history that is still true. Trimming a rule because it reads like background is how a rule gets lost.
  - **A summary must stand on its own.** If understanding how the system works today means opening a decision record or an archived file, that is a defect in the summary, not a research step.
  - **When a doc and the code disagree, establish which one is wrong before reconciling them.** Editing the doc to match the code launders a bug into documented behaviour. A documentary asymmetry — one change argued at length, its reversal recorded nowhere — is evidence of intent, not proof of it. Ask.

---

## Asana task tracking

The Asana board **Sorrel & Salt** is the source of truth for what to work on. `TASKS.md` is the reasoning behind the breakdown, and the two are expected to agree — when a task is added to the board, add it to `TASKS.md` in the same pass, or the docs silently fall behind. Board sections are the milestones (M0–M11); the `Task ID` text field carries the `M0.1`-style identifier.

| Object          | GID                |
| --------------- | ------------------ |
| Project         | `1218257926462425` |
| `Status` field  | `1218259502689548` |
| → `Not Started` | `1218259502689549` |
| → `In Progress` | `1218259502689550` |
| → `In Review`   | `1218259502689551` |
| → `Completed`   | `1218259502689552` |

Set it with `asana_update_task`, passing `custom_fields` as `{"1218259502689548": "<option gid>"}`. The field reaches subtasks even though they are not project members, so no task needs adding to the project first.

**Every task carries a `Status` single-select**, and it moves in one direction only:

| Status        | Set it when                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| `Not Started` | The default. Every task starts here and stays there until work actually begins.                            |
| `In Progress` | The feature branch for the task exists and work has started — not when the task is merely read or planned. |
| `In Review`   | The PR is open. Set it in the same turn the PR is created, alongside the comment carrying the PR link.     |
| `Completed`   | The PR is **merged**. Never before — a green CI run is not a merge.                                        |

Rules that follow from this:

- **Set the status through the Asana MCP tools, in the same turn as the event.** A status left stale is worse than no status: it says work is happening that is not.
- `Completed` and the task's completed checkbox move together. Both happen on merge, never earlier.
- Do not skip states. A task that goes `Not Started` → `Completed` hides the review step that the one-task-per-PR rule exists to make visible.
- Status is not a substitute for the progress comment. Comment on the task as work proceeds; the status field is the at-a-glance summary of those comments, not a replacement.
- If a PR is closed without merging, the task returns to `In Progress` — not `Completed`, not `Not Started`.

---

## Out of scope for v1

Do not build, and do not leave hooks for beyond what the design doc names: the **entire notes subsystem** (stories 35–46; §13), edit history, viewer spell approval, compendium/category suggestions, duplicate merge tooling, bulk add from the compendium, GraphQL response caching, email/password sign-in, note moderation.

Story numbers 35–46 are **not reused** — v1 is 44 stories, numbered 1–34 and 47–56.

The one v1 concession to v2: the ingredient detail page (M8.19) is built so a notes section can be added beneath it without restructuring.

---

## Skills

Skills live in `.claude/skills/<name>/SKILL.md` and are invoked as `/<name>`. The table below is the trigger reference; [`claude-docs/agent-skills.md`](claude-docs/agent-skills.md) carries the shape and the hedges inside the skill files that are still stale.

| Skill              | Trigger                                                                                                                                                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start-task`       | "start M0.31", "start a task", `/start-task` — asks for an Asana Task ID, reads its `Type`, then runs `create-feature` (`Feature`/`Task`/`Bugfix`) or `create-hotfix` (`Hotfix`), passing the task through.                                                       |
| `create-feature`   | "start a feature branch", "new feature", `/create-feature` — asks for a name and the Asana task ID, branches `feature/<slug>` off latest `origin/staging`, moves the task to `In Progress`.                                                                       |
| `create-hotfix`    | "start a hotfix", "hotfix branch", `/create-hotfix` — asks for a name and the Asana task ID, branches `hotfix/<slug>` off latest `origin/main`, moves the task to `In Progress`.                                                                                  |
| `create-pr`        | "open a PR", "create a pull request", "get this reviewed" — commits (after asking), pushes, opens a PR against the Gitflow-appropriate target, moves the Asana task to `In Review` and comments the PR link. `hotfix/*` opens PRs into both `main` and `staging`. |
| `create-release`   | "cut a release", "create a release branch", `/create-release` — bumps semver, branches `release/<version>` off `staging`, tags `v<version>`, opens a PR into `main`.                                                                                              |
| `create-main-sync` | "sync main into staging", "bring the hotfix back to staging", `/create-main-sync` — branches `main-sync/<timestamp>` off `main`, opens a PR into `staging`.                                                                                                       |
| `prune-branches`   | "clean up my branches", "prune stale branches", "delete branches gone on remote" — deletes merged/gone local branches, asks about never-pushed ones. Never touches `main`/`staging`.                                                                              |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
