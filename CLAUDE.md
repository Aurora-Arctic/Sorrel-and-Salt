# CLAUDE.md

Guidance for Claude Code working in this repository.

`claude-docs/DESIGN.md` is the specification. `claude-docs/TASKS.md` is the work breakdown, indexing `claude-docs/tasks/` and `claude-docs/waves/`, and is corrected in place when wrong — "frozen" means not re-scoped. Its **Execution order**, not its milestone numbering, is the schedule. §n points into `DESIGN.md`, M0.1 into `TASKS.md`.

**Precedence: `DESIGN.md`, then this file, then a rule file.** Each `.claude/rules/<area>.md` is the long form of lines here, never a rule of its own, and loads once a file its `paths:` names is read. A read through the shell loads none, so open the one for the area you edit. When two disagree, fix the lower one.

## Vocabulary

Three domain nouns, each meaning exactly one thing. Use them consistently in routes, components, tests, commits, and conversation.

| Term            | Meaning                                                      |
| --------------- | ------------------------------------------------------------ |
| **Compendium**  | The global, admin-curated ingredient reference. What exists. |
| **Ingredients** | A workspace's own ingredients and stock. What you have.      |
| **Grimoire**    | A workspace's spells. What you make.                         |

Never write "catalog" — it was the old word for the compendium and it is gone.

The schema entity is `workspaces` and the URL prefix `/coven/`, a deliberate divergence (§5). Code, schema, and prose say _workspace_. Only the URL segment says _coven_.

## Commands

The devcontainer has no `make`, no `docker` and **no Python**: run the npm scripts, and script with `node -e`, `jq`, `grep` or `sed`. `make help` lists the host's targets; claude-docs/commands.md is the full table.

| Command                         | Purpose                                                 |
| ------------------------------- | ------------------------------------------------------- |
| `npm run dev`                   | Dev server on **8000**, with Altair at `/api/graphql`   |
| `npm run build` / `start`       | Production build; e2e serves it on **8001** and up      |
| `npm run pre-commit`            | `lint`, `format:check`, `typecheck` — test-free (MB.38) |
| `npm run test:coverage`         | Vitest's four projects, 80% threshold                   |
| `npm run test:stories`          | The acceptance suite, one line per v1 story             |
| `npm run e2e`                   | Playwright, a database and a server per worker          |
| `npm run codegen`               | `src/gql/` from the committed SDL; commit the output    |
| `npm run db:migrate`            | Applies migrations; `db:generate` writes one            |
| `npm run db:seed` / `db:reset`  | Seeds `SEED_SCENARIO`; reset drops, migrates and seeds  |
| `npm run check:destructive-ddl` | Flags destructive DDL in the branch's new migrations    |

**Verify with `test:coverage`, not `test`**: a plain pass can still fail CI on the 80% threshold alone. **Deploys are CI-only** (M0.26), through `.github/workflows/deploy.yml`.

## Non-negotiable architecture rules

The long forms of rules 2–5 and 10 are `.claude/rules/database.md`, of 8 and 9 `.claude/rules/graphql.md`; the argument is each subsystem's `claude-docs/` summary.

**1. Authorization lives in `src/modules/*/services/`. Never in resolvers, never in pages.** Server components call services directly (wrapped in React `cache()`); everything the browser initiates — every mutation, and every read without a navigation — goes through `/api/graphql`. Two transports, one set of rules, because both end at the same service function. There is no third access path: no server actions, no bespoke route handlers, and admin is not an exception (M3.8). The OAuth handshake at `/api/auth/*` is outside both and carries no application data (M2.2).

**2. Only `src/db/repository/` may import the database client.** Callers import its `index.ts`; three files outside it hold a named exemption, and a fourth is a decision (M1.17). Above services, `src/graphql/**`, `src/app/**` and `src/components/**` import nothing under `src/db` at runtime (M3.9), and every service opens with `import 'server-only'`.

**3. All writes go through `withAudit(session, fn)`.** It opens the transaction, takes the audit ids from the session, never a request body, and publishes the actor as `app.current_user_id`. Tables spread `...auditColumns`; a trigger owns `updated_at`, added by each audited table's own migration (M1.18). Reads open no transaction. Only two identity bootstraps write outside it: the sign-up hook in `src/lib/auth.ts`, and `src/db/seed/`.

**4. Soft-delete filtering happens in the repository, never at call sites.** No exported finder returns a `deleted_at IS NOT NULL` row and no writer touches one, bar named finders for what a spell holds (M5.3) and for the ingredient a substitute links (MB.138). Every unique index is partial (`WHERE deleted_at IS NULL`). Nothing outside the database layer imports `drizzle-orm` at runtime (MB.33); `import type` is legal.

**5. Two authorization layers, deliberately: the service check, and the `Membership` proof it returns.** `assertMembership(session, workspaceId, permission)` returns a branded `Membership` only the membership service can build, and every workspace-scoped finder and writer takes it first and ANDs its `workspace_id` itself. `assertSiteAdmin` does the same for the compendium tier. A `permission` is a per-role statement, never a rank. RLS is deferred, not rejected (MB.29).

**6. Never cache anything not keyed by viewer identity.** The compendium, categories and the admin-curated vocabularies are cacheable (`unstable_cache`, tag `compendium`, `revalidateTag` on every admin mutation). Anything workspace-scoped is not.

**7. Filter in SQL, not after fetching.** A private spell must never reach a resolver. Same for cross-workspace rows.

**8. Every list paginates through the M3.6 cursor helper.** Declare it with `t.pagedConnection` and read it through `findPage`/`findPageInWorkspace`; `tests/guards/pagination.test.ts` fails a bare list.

**9. DataLoader is not optional.** An N+1 is a billing bug on Vercel as well as a slow one. Loaders are built per request, never at module level: only `src/graphql/loaders/define-loader.ts` imports `dataloader` at runtime (M3.2).

**10. Migrations are expand/contract and forward-only.** No down migrations. Destructive DDL needs a `src/db/migrations/<tag>.ack.md` sidecar saying `Destructive DDL acknowledged: <reason>` (MB.48), and a column or index drop is two PRs, each its own task.

## Domain invariants that are easy to get wrong

- **The site is invite-gated.** Signing in with any registered provider (Google, Discord, Facebook, Microsoft — M2.6) earns an account and _nothing else_. **The compendium is the one public surface** (MB.80): `/compendium` and `/compendium/ingredients/[slug]` are readable without an account and indexable by search engines, the compendium read takes no session, and nothing workspace-scoped follows them out — a workspace entry's slug at the public route is a 404. `canCreateWorkspace` defaults to `false` and turns true only by accepting an invitation (M7.5), an admin grant (M5.8), or being made admin (MB.59), and a CHECK makes every admin hold it, so the gate reads the flag alone (MB.177). Once true it stays true until an admin revokes it, which leaves the workspaces already created (M5.8). Nothing in the OAuth flow sets it.
- **There are no personal workspaces.** No `kind` column; every workspace can take members and be deleted by an owner.
- **Admins curate the compendium, global categories, the ingredient form vocabulary, the two group vocabularies that organise them, the planet and zodiac vocabularies, and the deity vocabulary with the traditions that group it — and nothing else.** A site admin has no access to any workspace's ingredients or grimoire — asserted by test (M6.6). `category_groups` and `ingredient_form_groups` are tables rather than enums precisely so an admin can add one without a migration (MB.35, §5); a category group carries `colorDark` and `colorLight` as hexes on the row, never Sass tokens, each contrast-checked on write against its theme's harder surface. Groups list alphabetically by name — there is no order column.
- **What the compendium says, it sources.** Every compendium entry and every curated row drawn from somewhere records where, as `references` rows — Chicago bibliography form, linked from every row it supports, two-tiered as ingredients are (§5; MB.151–MB.156). An unsourced entry still saves, and sits on the admin's to-do list. A seed list compiled by hand records its sources in its seed doc the same way: without them it is not done.
- **An ingredient's identity is its formal name and its form.** `canonicalKey` is `lower(coalesce(canonical_name, name))` plus the normalised `form`; `name` is only what the ingredient is called _here_ and is freely relabellable, because identity moved off it. The compendium declares a `nomenclature` for every entry — `none` and `unknown` are answers, not absences, the same way `unitConvert` refuses rather than guesses. `ingredients.form` is text, **not a foreign key**: the curated vocabulary is an autofill, so an uncurated value stays writable. Local-beats-compendium resolution matches on identity, falling back to the label only when the local entry declares no formal name. Common-name and form lookups suggest from the compendium and the current workspace only — never another workspace, and that scoping covers the suggested strings themselves, not just their attribution.
- **Invitations grant `viewer` or `member` only.** A DB check constraint rejects `owner`. Ownership is granted afterwards by an existing owner on the members page.
- **Spell visibility widens only.** `private → workspace` is allowed; `workspace → private` is rejected with an explaining error, not a bare `Forbidden`. Enforced in the service and asserted by test — not merely absent from the UI. The rule governs visibility, not existence: a shared spell can still be deleted.
- **Viewers write nothing.** With notes deferred to v2, there is no exception.
- **An address changes only at verification.** `setEmail` writes nothing to `users.email`: it mails the new address Better Auth's change link, and `/verify-email` swaps the address and verifies it in one write, from a session holding the row. Marking the row unverified instead would put an established account under MB.67's sweep. An unverified account reaches no page but `/account/email`: `requireSession()` sends it there from every other (`claude-docs/auth/admin-bootstrap.md`, "The email page").
- **Unit conversion is within one dimension only.** weight↔weight and volume↔volume; anything crossing dimensions, and anything involving `count`, is refused as an explicit result the caller must handle — never null, NaN, or a guess. **No density table exists anywhere in the codebase.**
- **Two kinds of spell category.** Assigned categories are what the spell _intends_; derived categories are the union of its ingredients'. Conflating them is a bug.
- **Invitation tokens** use `crypto.randomBytes()`, never `Math.random()`. Only the hash is stored, and the link is mailed to the invited address (M7.3, on MB.65's transport) and accepted only by a signed-in account whose verified email matches it; it appears in no response and is never copied. Email verification itself uses Better Auth's signed, unstored token, which is the one token here that is neither hashed nor single-use (claude-docs/design-decisions/mb.61-email-verification-and-delivery.md).
- **`/admin` returns a styled "not authorized" page** to a signed-in non-admin. `/coven/[slug]` returns **404** to a non-member — workspace existence is private, `/admin` is a path everyone already knows.

## Testing

TDD throughout: write the failing test, watch it fail, write the minimum, refactor. Each wave opens with an acceptance-test scaffold PR that lands red on purpose. Long form, with the harness: `.claude/rules/testing.md`.

- **Every Vitest file lives under `tests/`, mirroring `src/`**, and every Playwright spec under `tests/e2e/` (MB.41); a test left in `src/` is a file nothing runs.
- **Tests never touch Neon.** Local Postgres 18 everywhere else. Anything touching Postgres goes in the `db` project, under `tests/db/` or `tests/modules/`, and is never wrapped in a rolled-back transaction.
- Fixture users: **A** owner of W · **B** member of W · **C** viewer in W · **D** member of unrelated X · **E** site admin in no workspace. `asUser(A)` gives a session; services throw `Forbidden`.
- **Fixture factory defaults are invented names, never real ones** (M1.25) — Testwort / _Fixtura testalis_, Fixture Coven.
- **Setup rows go through the raw `postgres` client and the shared inserters, never `withAudit`** (MB.101).
- Acceptance tests name their story (`describe('Story 12: ...')`), and are tracked apart from the 80% line.
- **Accessibility is asserted in Playwright** via `@axe-core/playwright`, not `vitest-axe`.
- Component tests use role and label queries only. No test ids for anything a user can see. A test proves a functional requirement by the state it leaves, never by copy, class or layout; a regression test needs a bug that reached a PR.
- **No snapshots** except design tokens and the GraphQL SDL.
- Bug fixes start with a regression test.
- Authorization tests must assert **direct-id** access is refused, not merely that a row is absent from a list.
- **An authorization test must also assert why the access could have succeeded** — the preconditions, not just the outcome. A test that would stay green with the guard removed proves nothing, so prove it fails without it.

## Conventions

- **One task per PR.** Do not combine tasks, even small adjacent ones. A sub-hour fix noticed along the way rides in that task's PR and is named in its body, without an `MB` id (MB.31).
- **A table task, then a behaviour task.** Never bundle `CREATE TABLE` with the policy or service that governs it.
- **The sweep-task rule.** A sweep over **database objects** lands once, right after the last object it covers, under a catalogue-introspection test. A sweep over **code** lands as a mechanism plus a mechanical guard, as early as it can be written, and each later task adopts it in its own PR. The tell: can the thing be made _impossible_, or only _absent_?
- A task is done when every acceptance criterion is demonstrably met — not when the code appears to work.
- **Modules:** `src/modules/<name>/` — `identity`, `coven`, `vocabulary`, `ingredients`, `grimoire` — each owns its tables and services, and another module reaches it only through `@/modules/<name>` (claude-docs/modules.md).
- **A type lives in a type-only file** (MB.108), by default the `types.ts` beside its users (claude-docs/modules.md, "Where types live").
- **Every slug comes from `src/lib/slugify.ts`** (M4.3), derived from the name and never written down beside it.
- **Components and styling** follow `.claude/rules/components.md`: a directory, a story and a doc per component, Sass `@use` and never `@import`, and no styling past the tokens before the section's design review.
- **Gitflow:** `feature/*` → `staging`; `staging` → `main` via `release/MAJOR.MINOR.PATCH`; `hotfix/*` opens both; `main-sync/YYYY-MM-DD-HH-MM-SS` brings `main` back down. Staging carries the same protections as production.
- **Document as you go** in `claude-docs/`, correcting a doc in the PR that makes it wrong (MB.31); `claude-docs/archive/` is frozen and never read. When a doc and the code disagree, establish which is wrong before reconciling them (claude-docs/README.md).
- **A comment says what this is and why it is not the obvious alternative; the argument lives in `claude-docs/`** (MB.50). Never cut a fact the reader cannot recover, or a comment a tool reads (claude-docs/README.md, "Comments in code").
- **Flag an architecture decision that costs more than it buys** — do not route around it, and do not change it unasked. Put it to the user with the code it made harder and the change you recommend, and keep to the current rules meanwhile. An accepted change corrects `DESIGN.md` or this file, recorded in `claude-docs/design-decisions/<id>-<slug>.md` in that task's PR.

## GitHub task tracking

The issues of `Aurora-Arctic/Sorrel-and-Salt`, under the org Project **Sorrel & Salt** (number `1`), are what to work on; `TASKS.md` is the reasoning behind them. The repo is public, so every issue and comment is too. Long form: `.claude/rules/task-tracking.md`, and claude-docs/task-tracking.md.

- **Everything goes through `node scripts/task-board.mjs`** — `find`, `status`, `comment`, `estimate`, `sync`, `list`, `reorder`. Never hand-compose `gh issue`.
- **An issue mirrors its entry.** Edit an entry in `claude-docs/tasks/`, and `sync <ID>` its issue in the same pass.
- **`find <ID>` matches the title on `<ID> — ` exactly.** Zero matches, or several: stop and say so.
- **Status moves forward, in the same turn as the event**: `Not Started` is the Project's; `In Progress` once the branch exists and work starts; `In Review` when the PR opens, with a comment carrying its link; `Done` is the merge's.
- **Never close a task by hand.** A PR closed unmerged sends its task back to `In Progress`.
- **A PR body opens with `Closes #N`**, or `Refs #N` for a PR that does not finish the task.
- **Comments name, never carry values**: an env var, a file or a provider, but never a value, token, connection string, address or dashboard URL.

## Out of scope for v1

Do not build, and do not leave hooks for beyond what the design doc names: the **entire notes subsystem** (stories 35–46; §13), edit history, viewer spell approval, compendium/category suggestions, duplicate merge tooling, bulk add from the compendium, GraphQL response caching, passkeys and every other first-party credential (email/password sign-in included), note moderation, subscription billing, help and FAQ articles (§13; MB.175).

Story numbers 35–46 are **not reused** — v1 is 52 stories, numbered 1–34 and 47–64.

The one v1 concession to v2: the ingredient detail page (M8.19) is built so a notes section can be added beneath it without restructuring.

## Skills

Skills live in `.claude/skills/<name>/SKILL.md` and are invoked as `/<name>`. Each one's trigger is its own description, which every session lists; claude-docs/agent-skills.md tables them all with what each does.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
