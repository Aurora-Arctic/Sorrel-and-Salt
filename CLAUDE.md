# CLAUDE.md

Guidance for Claude Code working in this repository.

`claude-docs/DESIGN.md` is the specification. `claude-docs/TASKS.md` is the work breakdown, indexing `claude-docs/tasks/` and `claude-docs/waves/`, and is corrected in place when wrong; "frozen" means not re-scoped. Its **Execution order**, not its milestone numbering, is the schedule. §n points into `DESIGN.md`, M0.1 into `TASKS.md`.

**Precedence: `DESIGN.md`, then this file, then a rule file.** Each `.claude/rules/<area>.md` is the long form of lines here, never a rule of its own, and loads once a file its `paths:` names is read. A read through the shell loads none, so open the one for the area you edit. When two disagree, fix the lower one.

## Vocabulary

Three domain nouns, each meaning exactly one thing, used consistently everywhere.

| Term            | Meaning                                                       |
| --------------- | ------------------------------------------------------------- |
| **Compendium**  | The global, keeper-curated ingredient reference. What exists. |
| **Ingredients** | A workspace's own ingredients and stock. What you have.       |
| **Grimoire**    | A workspace's spells. What you make.                          |

Never write "catalog".

Code, schema and prose say _workspace_; the URL prefix `/coven/` and the screens say _coven_ (§5, MB.119). Coven roles show as **Steward**, **Practitioner** and **Observer**; code, the GraphQL enum and the schema keep `owner`, `member` and `viewer`. "Member" is also the general word for anyone with a seat in a coven. The site role `admin` shows as **Keeper**, matching `/keepers`; code, the schema, `assertSiteAdmin` and GraphQL keep `admin`. Keeper, curator and site keeper are site roles, not coven roles.

## Commands

The devcontainer has no `make`, no `docker` and **no Python**: run the npm scripts, and script with `node -e`, `jq`, `grep` or `sed`. claude-docs/commands.md is the full table.

| Command                         | Purpose                                          |
| ------------------------------- | ------------------------------------------------ |
| `npm run dev`                   | Dev server on **8000**, Altair at `/api/graphql` |
| `npm run build` / `start`       | Production build; e2e serves it on **8001**+     |
| `npm run pre-commit`            | Lint, format, types on changed files (MB.38)     |
| `npm run test:coverage`         | Vitest's six projects, 80% threshold             |
| `npm run test:stories`          | Story suite (Playwright), one line per story     |
| `npm run e2e`                   | Playwright, a database and server per worker     |
| `npm run codegen`               | `src/gql/` from the SDL; commit the output       |
| `npm run db:migrate`            | Applies migrations; `db:generate` writes one     |
| `npm run db:seed` / `db:reset`  | Seeds `SEED_SCENARIO`; reset drops first         |
| `npm run check:destructive-ddl` | Flags destructive DDL in new migrations          |

**While working, run the individual test files and specs a change touches.** `test:coverage`, `test:stories` and the full e2e suite run only when the owner says so. When they do, run `test:coverage`, not `test`: a plain pass can still fail CI on the 80% threshold alone. **Every local Playwright run (`e2e`, `test:stories`, a named spec) sets `BETTER_AUTH_SECRET=local-dev-not-a-real-secret` on its command line**, so the real secret is never read for a test run; a worktree copies `/app`'s `.env.local` first (`.claude/rules/testing.md`, "Process"; claude-docs/commands.md). **Deploys are CI-only**, through `.github/workflows/deploy.yml`.

## Non-negotiable architecture rules

The long forms of rules 2–5 and 10 are `.claude/rules/database.md`, of 8 and 9 `.claude/rules/graphql.md`.

**1. Authorization lives in `src/modules/*/services/`. Never in resolvers, never in pages.** Server components call services directly (in React `cache()`); everything the browser initiates, meaning every mutation and every read without a navigation, goes through `/api/graphql`. There is no third access path: no server actions, no bespoke route handlers, and admin is not an exception. The few routes outside both carry no application data (`.claude/rules/graphql.md`, "Access paths outside /api/graphql").

**2. Only `src/db/repository/` may import the database client.** Callers import its `index.ts`; three files outside it hold a named exemption, and a fourth is a decision. `src/graphql/**`, `src/app/**` and `src/components/**` import nothing under `src/db` at runtime, and every service opens with `import 'server-only'`.

**3. All writes go through `withAudit(session, fn)`.** It opens the transaction, takes the audit ids from the session, never a request body, and publishes the actor as `app.current_user_id`. Tables spread `...auditColumns`; a trigger owns `updated_at`. The writes outside it, and the two signed-out mutations, are named in `.claude/rules/database.md`, Rule 3.

**4. Soft-delete filtering happens in the repository, never at call sites.** No exported finder returns a `deleted_at IS NOT NULL` row and no writer touches one, bar a short named list (`.claude/rules/database.md`, Rule 4). Every unique index is partial (`WHERE deleted_at IS NULL`). Nothing outside the database layer imports `drizzle-orm` at runtime; `import type` is legal.

**5. Two authorization layers, deliberately: the service check, and the `Membership` proof it returns.** `assertMembership(session, workspaceId, permission)` returns a branded `Membership` only the membership service can build, and every workspace-scoped finder and writer takes it first and ANDs its `workspace_id` itself. `assertSiteAdmin` does the same for the compendium tier. A `permission` is a per-role statement, never a rank. Two named exceptions take no proof (`.claude/rules/database.md`, Rule 5). RLS is deferred, not rejected (MB.29).

**6. Never cache anything not keyed by viewer identity.** The compendium, categories and the keeper-curated vocabularies are cacheable (`unstable_cache`, tag `compendium`, `revalidateTag` on every keeper mutation), and so are the site's published documents (tag `documents`, `src/lib/documents-cache.ts`). Anything workspace-scoped is not.

**7. Filter in SQL, not after fetching.** A private spell or another workspace's row must never reach a resolver.

**8. Every list paginates through the M3.6 cursor helper.** Declare it with `t.pagedConnection` and read it through `findPage`/`findPageInWorkspace`; `tests/guards/pagination.test.ts` fails a bare list.

**9. DataLoader is not optional.** Loaders are built per request, never at module level: only `src/graphql/loaders/define-loader.ts` imports `dataloader` at runtime.

**10. Migrations are expand/contract and forward-only.** No down migrations. Destructive DDL needs a `src/db/migrations/<tag>.ack.md` sidecar saying `Destructive DDL acknowledged: <reason>` (MB.48), and a column or index drop is two PRs, each its own task.

## Domain invariants that are easy to get wrong

The long form of each is `.claude/rules/domain.md`.

- **The site is invite-gated.** Signing in by any method earns an account and an observer seat in the demo coven, and nothing else. **The compendium is the one public surface of data** (MB.80): `/compendium` and its entry pages are readable without an account and indexable, and nothing workspace-scoped follows them out. `canCreateWorkspace` defaults to `false`; accepting an invitation, a keeper grant, or being made keeper or curator turns it true, and only a keeper revokes it. The other open pages (`/help`, `/support`, `/support/request`, the public documents) carry no workspace data.
- **There are no personal workspaces.** One demo coven, flagged `workspaces.demo`, is seeded on every environment and cannot be deleted.
- **Keepers and curators curate the compendium, its vocabularies and the site documents, and review support requests, and nothing else.** A site keeper or curator has no access to any workspace's ingredients or grimoire, except the demo coven, where every keeper holds a steward seat; a test asserts it. `assertCurator` passes either role, `assertSiteAdmin` a keeper only.
- **What the compendium says, it sources** as `references` rows (§5). **A formal name is a unique identifier and a common name never is**: doubt goes to `needs-review`, never into an `approved` seed file (M14.4).
- **An ingredient's identity is its formal name alone; each form it comes in is a variant beneath it** (MB.215). A variant adds to its ingredient and never removes from it, and its `form` is text, not a foreign key. Lookups suggest from the compendium and the current workspace only.
- **Invitations grant `viewer` (Observer) or `member` (Practitioner) only.** A database CHECK rejects `owner`; a steward grants Steward afterwards.
- **A complete spell's visibility widens only, and it never goes back to a draft.** `workspace → private` is rejected with an explaining error, enforced in the service and asserted by test; a change goes through a draft copy (`duplicateSpell`). Assigned and derived spell categories are different things; conflating them is a bug.
- **Observers write nothing to a workspace** (an observer may still send a support request). **An address changes only at verification**: `setEmail` writes nothing to `users.email`.
- **Unit conversion is within one dimension only.** Crossing dimensions, or involving `count`, is refused as an explicit result, never null, NaN or a guess. No density table exists.
- **Invitation and support-view tokens** use `crypto.randomBytes()`, store only the hash and appear in no response. A printed card's token is the one exception: returned once, at minting, to the keeper who mints it.
- **`/curator` and `/keepers` return a styled "not authorized" page** to a signed-in user who is neither a curator nor a keeper. `/coven/[slug]` returns **404** to a non-member.

## Testing

TDD throughout: write the failing test, watch it fail, write the minimum, refactor. Long form, with the harness: `.claude/rules/testing.md`.

- **Every Vitest file lives under `tests/`, mirroring `src/`**, and every Playwright spec under `tests/e2e/` (MB.41); a test left in `src/` is a file nothing runs.
- **Tests never touch Neon.** Anything touching Postgres goes in the `db` project (`tests/db/`, `tests/modules/`), never in a rolled-back transaction.
- Fixture users: **A** steward of W · **B** practitioner in W · **C** observer in W · **D** member of unrelated X · **E** site keeper in no workspace · **F** site curator in no workspace. `asUser(A)` gives a session; services throw `Forbidden`. Factory defaults are invented names (Testwort), never real ones.
- **A story is proved by a browser flow** under `tests/e2e/stories/`, tagged `{ tag: '@story-N' }`, never by a service call. A flaky story (failed, then passed on retry) stays unticked and does not count as passing. The suite is the PR gate's `stories` job, never a required check.
- **Accessibility is asserted in Playwright** via `@axe-core/playwright`, not `vitest-axe`. Setup rows go through the raw `postgres` client and the shared inserters, never `withAudit` (MB.101).
- Component tests use role and label queries only. A test proves a requirement by the state it leaves, never by copy, class or layout. **No snapshots** except design tokens and the GraphQL SDL. Bug fixes start with a regression test.
- Authorization tests must assert **direct-id** access is refused, not merely that a row is absent from a list, and must also assert why the access could have succeeded: the preconditions, not just the outcome. A test that would stay green with the guard removed proves nothing.

## Conventions

- **One task per PR.** Do not combine tasks, even small adjacent ones. A sub-hour fix noticed along the way rides in that task's PR and is named in its body (MB.31).
- **The browser floor is Baseline Widely Available, and below it the app degrades, never breaks.** `package.json`'s `browserslist` is the one statement of it; the build lowers CSS to it and `npm run lint:css` refuses CSS past it. A feature past it is allowed only as a pure enhancement behind `@supports` or a `typeof`/`in` check, and says so in a comment (`.claude/rules/components.md`).
- **A table task, then a behaviour task.** Never bundle `CREATE TABLE` with the policy or service that governs it.
- **The sweep-task rule.** A sweep over database objects lands once, after the last object, under a catalogue-introspection test. A sweep over code lands as a mechanism plus a mechanical guard as early as it can be written. The tell: can the thing be made _impossible_, or only _absent_?
- **Modules:** `src/modules/<name>/` (`identity`, `coven`, `vocabulary`, `ingredients`, `grimoire`, `support`, `documents`) each own their tables and services, and another module reaches one only through `@/modules/<name>` (claude-docs/modules.md).
- **A type lives in a type-only file** (MB.108), by default the `types.ts` beside its users (claude-docs/modules.md, "Where types live").
- **Every slug comes from `src/lib/slugify.ts`**, derived from the name and never written down beside it.
- **Components and styling** follow `.claude/rules/components.md`: no styling past the tokens before the section's design review.
- **Gitflow:** `feature/*` → `staging` → `main` via `release/MAJOR.MINOR.PATCH`; `hotfix/*` and `main-sync/*` as DESIGN.md §12 sets out.
- **Document as you go** in `claude-docs/`, correcting a doc in the PR that makes it wrong (MB.31). A doc holds only what adding a feature needs, each fact once, and never drops a fact; history that informs no future decision leaves it (claude-docs/README.md, "What a doc holds"). Text leaving a live doc moves to another live doc, or is deleted, or goes into a tarball under `claude-docs/archive/`, which is never read. When a doc and the code disagree, establish which is wrong first.
- **Write plainly**, for developers of every level: say what a thing does before naming it (`.claude/rules/writing.md`).
- **A comment is only what warns the reader of a nuance the code cannot show**: what this is and, in one present-tense clause, why not the obvious alternative. The detail, the history, task ids and dates live in `claude-docs/`, never in code (claude-docs/README.md, "Comments in code").
- **Flag an architecture decision that costs more than it buys.** Do not route around it or change it unasked: put it to the user with the code it made harder and the change you recommend. An accepted change corrects `DESIGN.md` or this file and gets a record in `claude-docs/design-decisions/`.

## GitHub task tracking

The issues of `Aurora-Arctic/Sorrel-and-Salt`, under the org Project **Sorrel & Salt** (number `1`), are what to work on; `TASKS.md` is the reasoning behind them. The repo is public, so every issue and comment is too. Long form: `.claude/rules/task-tracking.md`.

- **Everything goes through `node scripts/task-board.mjs`** (`find`, `status`, `comment`, `estimate`, `sync`, `list`, `reorder`). Never hand-compose `gh issue`.
- **`find <ID>` matches the title on `<ID> — ` exactly.** Zero matches, or several: stop and say so.
- **Status moves forward, in the same turn as the event**: `In Progress` once work starts, `In Review` when the PR opens (with a comment carrying its link), `Done` at the merge. Never close a task by hand.
- **A PR body opens with `Closes #N`**, or `Refs #N` for a PR that does not finish the task.
- **Comments name, never carry values**: an env var, a file or a provider, never a value, token, connection string, address or dashboard URL.

## Spending tokens

- A passing run prints only its verdict; on a failure read the failing part (`tail`, `grep`, `jq`). Read a file over ~300 lines by section.
- Never mask an exit code with a pipe: log to `.reports/<name>.log`, print `exit $?`, then tail the log.
- Verify once: run the specs a change touches, named together in one command so the servers start once; the full suites only when the owner says so.
- At a task boundary, suggest `/clear` to the owner. Each rule gives way when the owner asks otherwise, or when following it would thin a test (claude-docs/token-efficiency.md).

## Out of scope for v1

Do not build, and do not leave hooks for, anything listed in `claude-docs/backlog.md` beyond what the design doc names. A coven annotates a compendium entry or makes it its own, and that is the only direction in v1.

The one v1 concession to v2: the ingredient detail page is built so a notes section can be added beneath it without restructuring.

## Skills

Skills live in `.claude/skills/<name>/SKILL.md`, invoked as `/<name>`; claude-docs/agent-skills.md tables them.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
