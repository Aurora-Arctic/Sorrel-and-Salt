# CLAUDE.md

Guidance for Claude Code working in this repository.

`claude-docs/DESIGN.md` is the specification and `claude-docs/TASKS.md` is the work breakdown (185 tasks, 12 milestones; `TASKS.csv` beside it is the same breakdown exported for a project tracker). This file carries the rules that apply to *every* task; the section references below (§n) point into `DESIGN.md`, and milestone references (M0.1) into `TASKS.md`. When this file and the design doc disagree, the design doc wins — and fix this file.

**Status: pre-scaffold.** The repo currently contains documentation only. Nothing under "Commands" exists until the milestone that creates it lands (M0.1–M0.4 for the toolchain, M1.3 for the database scripts). Do not assume a command runs; check first.

---

## Vocabulary

Three domain nouns, each meaning exactly one thing. Use them consistently in routes, components, tests, commits, and conversation.

| Term | Meaning |
|---|---|
| **Compendium** | The global, admin-curated ingredient reference. What exists. |
| **Ingredients** | A workspace's own ingredients and stock. What you have. |
| **Grimoire** | A workspace's spells. What you make. |

Never write "catalog" — it was the old word for the compendium and it is gone.

The schema entity is `workspaces`; the URL prefix is `/coven/`. This divergence is deliberate (§5). Code, schema, and prose say *workspace*. Only the URL segment says *coven*.

---

## Commands

Once M0.4 lands, `make help` lists every target. Expected surface:

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server on **8000** |
| `npm run build` / `npm run start` | Production build; e2e runs it on **8001** |
| `npm run lint` / `format:check` / `typecheck` | The pre-commit trio |
| `npm run test:coverage` | Vitest, both projects (`unit` jsdom + `db` node/Postgres) |
| `make test-stories` | Acceptance suite only; prints a pass/fail line per user story |
| `make docker-up` | App + Postgres 17 locally, no Neon connection needed |
| `make db-reset` | Drop, migrate, reseed local |
| `npm run db:generate` / `db:migrate` / `db:seed` / `db:reset` | Drizzle migrations and seed |
| `npm run codegen` | graphql-codegen; CI fails if output is stale |
| `make act-*` | Run a CI workflow locally via act |

**Verify with the `:coverage` variants.** A plain `npm run test` pass can still fail CI on the 80% threshold (lines, branches, functions, statements) alone. Carried over from `resume-2026`.

---

## Non-negotiable architecture rules

**1. Authorization lives in `src/services/`. Never in resolvers, never in pages.**
Server components call services directly (wrapped in React `cache()`); everything the browser initiates — every mutation, and every read without a navigation — goes through `/api/graphql`. Two transports, one set of rules, because both end at the same service function. There is no third access path: no server actions, no bespoke route handlers, and admin is not an exception (M3.8).

**2. Only `src/db/repository.ts` may import the database client.**
Enforced by lint (M1.17, M3.9). `src/graphql/**` and `src/app/**` may not import the client or the repository — they reach services and nothing below.

**3. All writes go through `withAudit(session, fn)`.**
It opens the transaction, injects the audit ids from the *session* (never from a request body), and issues `SET LOCAL app.current_user_id = '<uuid>'`. Every table carries the six-column `...auditColumns` spread, join tables included.

**4. Soft-delete filtering happens in the repository, never at call sites.**
No exported finder can return a `deleted_at IS NOT NULL` row. Every unique index is partial (`WHERE deleted_at IS NULL`) — without it, deleting a record permanently reserves its name.

**5. Two authorization layers, deliberately.**
`assertMembership(userId, workspaceId, minRole)` in the service, and an RLS policy reading `current_setting('app.current_user_id')` in the database. They look redundant; that is the point. M6.5 and M10.3 prove the database layer holds with the service check stubbed out.

**6. Never cache anything not keyed by viewer identity.**
The compendium and categories are cacheable (`unstable_cache`, tag `compendium`, `revalidateTag` on every admin mutation). Anything workspace-scoped is not.

**7. Filter in SQL, not after fetching.**
A private spell must never reach a resolver. Same for cross-workspace rows.

**8. Every list paginates through the M3.6 cursor helper.** Default 25, hard server maximum 100, cursors encode sort key + id and never an offset.

**9. DataLoader is not optional.** Compute has a dollar cost on Vercel, so an N+1 is a billing bug as well as a slow one. Loaders are constructed per request, never at module level.

**10. Migrations are expand/contract and forward-only.** No down migrations exist in this repo. Destructive DDL (DROP, RENAME, type narrowing, NOT NULL additions) is flagged by CI and needs an explicit acknowledgement line in the PR body.

---

## Domain invariants that are easy to get wrong

- **The site is invite-gated.** Signing in with Google or GitHub earns an account and *nothing else*. `canCreateWorkspace` defaults to `false` and turns true only by accepting an invitation (M7.5) or an admin grant (M5.8). Once true it stays true. Nothing in the OAuth flow sets it.
- **There are no personal workspaces.** No `kind` column; every workspace can take members and be deleted by an owner.
- **Admins curate the compendium and global categories, and nothing else.** A site admin has no access to any workspace's ingredients or grimoire — asserted by test (M6.6).
- **Invitations grant `viewer` or `member` only.** A DB check constraint rejects `owner`. Ownership is granted afterwards by an existing owner on the members page.
- **Spell visibility widens only.** `private → workspace` is allowed; `workspace → private` is rejected with an explaining error, not a bare `Forbidden`. Widening is a gift, narrowing is a retraction. Enforced in the service *and* backstopped by RLS — not merely absent from the UI. The rule governs visibility, not existence: a shared spell can still be deleted.
- **Viewers write nothing.** With notes deferred to v2, there is no exception.
- **Unit conversion is within one dimension only.** weight↔weight and volume↔volume; anything crossing dimensions, and anything involving `count`, is refused as an explicit result the caller must handle — never null, NaN, or a guess. **No density table exists anywhere in the codebase.**
- **Two kinds of spell category.** Assigned categories are what the spell *intends*; derived categories are the union of its ingredients'. Conflating them is a bug.
- **Invitation tokens** use `crypto.randomBytes()`, never `Math.random()`. Only the hash is stored; the URL is returned once, in the mutation response.
- **`/admin` returns a styled "not authorized" page** to a signed-in non-admin. `/coven/[slug]` returns **404** to a non-member — workspace existence is private, `/admin` is a path everyone already knows.

---

## Testing

TDD throughout: write the failing test, watch it fail, write the minimum, refactor. Each milestone opens with an acceptance-test scaffold PR that intentionally lands red.

- **Tests never touch Neon.** Neon is deployment-only. Local Postgres 17 in Docker everywhere else — SQLite cannot run RLS, triggers, `pg_trgm`, or array columns, which are exactly what needs testing.
- Each Vitest worker clones `sorrel_test_${VITEST_WORKER_ID}` from the baked `sorrel_template`. Playwright uses `sorrel_e2e`. Do not wrap tests in a rolled-back transaction — `withAudit` opens its own, and `SET LOCAL` would leak one test user's identity into the next assertion.
- One seed module (`src/db/seed/index.ts`), three consumers (Docker, Vitest, Playwright), three scenarios: `minimal`, `standard`, `demo`.
- Fixture users: **A** owner of W · **B** member of W · **C** viewer in W · **D** member of unrelated X · **E** site admin in no workspace. `asUser(A)` gives a session; services throw `Forbidden`.
- Acceptance tests name their story (`describe('Story 12: ...')`) so a failure points at a requirement. Acceptance coverage is tracked separately from the 80% line threshold — they measure different things.
- **Accessibility is asserted in Playwright** via `@axe-core/playwright`, not `vitest-axe`.
- Component tests use role and label queries only. No test ids for anything a user can see.
- **No snapshots** except design tokens and the GraphQL SDL.
- Bug fixes start with a regression test.
- Authorization tests must assert **direct-id** access is refused, not merely that a row is absent from a list.

---

## Conventions

- **One task per PR.** Do not combine tasks, even small adjacent ones. Every task is sized 1–2h and reviewable in under 15 minutes.
- A task is done when every acceptance criterion is demonstrably met — not when the code appears to work.
- **Port, don't rewrite from memory.** The source repo for all ports is `resume-2026`.
- **Components:** `src/components/<Name>/` with `index.tsx`, `index.scss`, `index.test.tsx`, imported `from '../components/IngredientCard'`.
- **Sass:** modern module system only — `@use '../../scss/variables' as *;`, never `@import`. Shared partials in `src/scss/` are `@use`'d directly by whichever component needs them, never routed through a parent.
- **The design will change.** Do not build component styling beyond the tokens (M0.7) and mixins (M0.8).
- **No print styles anywhere except the spell recipe view** (M10.22). `_print.scss` is created by that task and scoped to it.
- Gitflow: `feature/*` → `staging`; `staging` → `main` via `release/MAJOR.MINOR.PATCH`; `hotfix/*` opens both; `main-sync/YYYY-MM-DD-HH-MM-SS` brings `main` back down. Staging carries the same protections as production; local development is the only relaxed environment.
- Document as you go in `claude-docs/` — a summary per subsystem, an append-only transcript, one doc per component. Several tasks name it as an acceptance criterion.

---

## Out of scope for v1

Do not build, and do not leave hooks for beyond what the design doc names: the **entire notes subsystem** (stories 35–46; §13), edit history, viewer spell approval, compendium/category suggestions, duplicate merge tooling, bulk add from the compendium, GraphQL response caching, email/password sign-in, note moderation.

Story numbers 35–46 are **not reused** — v1 is 44 stories, numbered 1–34 and 47–56.

The one v1 concession to v2: the ingredient detail page (M8.19) is built so a notes section can be added beneath it without restructuring.

---

## Skills

No Claude skills are ported into this repo yet. **M0.10** ports the applicable ones from `resume-2026` (testing conventions, component documentation, commit and PR conventions, CI debugging) and requires listing them here with their triggers. Update this section when that task lands.
