---
paths:
  - 'src/db/**'
  - 'src/modules/*/schema/**'
  - 'src/modules/*/services/**'
  - 'tests/db/**'
  - 'tests/modules/**'
  - 'tests/support/db/**'
  - 'scripts/db-seed.ts'
  - 'scripts/check-destructive-ddl.ts'
  - 'drizzle.config.ts'
---

# Database rules

The long form of `CLAUDE.md`'s architecture rules 2 to 5 and 10. `CLAUDE.md` carries each rule's binding sentence and wins over this file; `claude-docs/db.md` carries the argument.

## Rule 2 — only `src/db/repository/` may import the database client

M1.17's `no-restricted-imports` rule enforces it — a new importer fails `npm run lint`. Inside the repository the three files that run a query carry the exemption — `write.ts`, `select.ts` and `provisional-users.ts` — and the rest of the folder is internal: callers import its `index.ts` (`@/db/repository`), and a deep import of any other file fails lint and `tests/guards/module-boundaries.test.ts` (MB.87). Three files are exempt besides the repository, each by a named `oxlint-disable-next-line` at the import and each because it needs a client rather than a writer: `src/lib/auth.ts` (Better Auth's `drizzleAdapter`), `scripts/db-seed.ts`, and `tests/db/test-database-isolation.test.ts`. That set is pinned by test — a fourth exemption is a decision, not a convenience.

Above services the ban is wider (M3.9): `src/graphql/**`, `src/app/**` and `src/components/**` may import nothing under `src/db` at runtime, so they reach services and nothing below. The other direction is `next build`'s job: every file under `src/modules/*/services` opens with `import 'server-only'`, so a client component that reaches one, directly or not, fails the build. A new service carries the marker, and `tests/guards/server-only-services.test.ts` fails one that does not. The `.oxlintrc.json` overrides are cut along the same lines: `src/modules/*/services/**/*.ts` is the services override, and `src/modules/*/schema/**/*.ts` sits with `src/db/**` in the database-layer one, since a schema file is where a table is built.

## Rule 3 — all writes go through `withAudit(session, fn)`

The actor's GUC goes out as `select set_config('app.current_user_id', $1, true)`, never a literal `SET LOCAL`, and goes out although nothing in v1 reads it; DESIGN.md §5, "Audit columns — on every table, and the join-table exception", says why each.

**The audit columns.** Every table spreads the six-column `...auditColumns` but `ingredient_categories` and `spell_categories`, which spread the four-column `...auditStampColumns` (rule 4 below); DESIGN.md §5 defines the six as the four plus the delete pair. The factories are `src/db/audit.ts`'s, and the instances every table spreads are built beside `users` in `src/modules/identity/schema/users.ts`, imported from there (MB.86).

**Reads open no transaction of their own** — a read carries identity in rule 5's `Membership` proof, which is a compile-time argument rather than a session variable, so there is no read-side counterpart to `withAudit` and nothing for it to nest with. The one read that opens a transaction is a trigram similarity read, and it opens it to publish no identity: `selectFrom` sets `pg_trgm.similarity_threshold` and `pg_trgm.word_similarity_threshold` in it with `set_config(…, true)` (claude-docs/db/fuzzy-matching.md, "Fuzzy matching").

**Two identity bootstraps write outside the wrapper, and only those two**: `src/lib/auth.ts`'s sign-up hook and `src/db/seed/` (M1.21) — each is how an identity comes to exist, so there is no session to hand over, and each stamps the row as its own creator. The seed does it through `applyAudit` inside the transaction it owns, where it also publishes the GUC, and writes through the handle it is given because that handle is the point of `seed(db, …)` (claude-docs/design-decisions/m1.21-seed-writes-through-its-handle.md). The sign-up hook stamps by hand and publishes no GUC: Better Auth's adapter gives it no transaction to publish into. The verification write is stamped the same way: `databaseHooks.user.update.before`, beside the sign-up hook, merges the verifying user's id into Better Auth's own `UPDATE` as `updatedBy` (MB.66). It and the provisional-account sweep (MB.67) are that same identity completing or lapsing, not a third bootstrap (claude-docs/design-decisions/mb.61-email-verification-and-delivery.md).

**`updated_at` is the database's, not the application's** (M1.18): one `set_updated_at()` trigger overwrites whatever `applyAudit` sends, while `updated_by` stays the session's — the database owns _when_, rule 3 owns _who_ (claude-docs/db/updated-at.md). **A new audited table adds its own `CREATE OR REPLACE TRIGGER` line in its own migration**, since `sorrel` may not create the event trigger that would attach one, and `tests/db/updated-at-trigger.test.ts` fails a table that forgets it.

## Rule 4 — soft-delete filtering happens in the repository

A writer leaves a deleted row alone because the way back is v2's restore, then an ordinary edit (DESIGN.md §13); a unique index carries the predicate because without it, deleting a record permanently reserves its name.

**One named exception: what a spell holds** (M5.3). A spell is a record of a working, so `findIngredientsInSpellsIncludingSoftDeleted` and `findManyOfSpellIngredientsIncludingSoftDeleted` keep reaching an ingredient — and its categories — soft-deleted after it went into the jar, for a member who may read the spell. They skip the ingredient's filter and no other, and `tests/guards/soft-delete-finder-guard.test.ts` pins both (claude-docs/design-decisions/m5.3-spells-keep-deleted-ingredients.md).

**Where a read is built.** `src/db/repository/select.ts` holds the two places a read query is built — `selectFrom`, and `existsIn` for the correlated subquery a finder scopes by a parent row with, which ANDs the parent's filter itself — and `tests/guards/soft-delete-finder-guard.test.ts` pins both: a third `.select(` in the folder, or an `existsIn` without the filter, fails it (MB.100). How `findMany`/`findOne` decide whether a table takes the filter is DESIGN.md §5's third enforcement rule.

**A `sql` fragment** in the repository means something a builder cannot say, or a rule keeping a whole statement raw, never a way around either builder (claude-docs/db/sql-fragments.md, "What a sql fragment is for"). A function call, an expression, a cast, a row value and `set_config` are raw; the comparison _around_ one is still the builder's — `gt`, `lt`, `ne`, `inArray` take a fragment on either side. Check that a builder exists in `node_modules/drizzle-orm` rather than taking a task's word for it. The schema files' index predicates, `CHECK`s and defaults are DDL, and the list does not govern them.

**Nothing outside the database layer may import `drizzle-orm` at runtime** (MB.33): a query cannot be built without that import, so the same `no-restricted-imports` entry rule 2 uses makes a call-site query unbuildable rather than merely unreviewed. `import type` stays legal everywhere, which is how the GraphQL layer names Drizzle types (§7).

**Two join tables are hard-deleted** (MB.34). A chip toggled off leaves no row in `ingredient_categories` or `spell_categories`, which carry no `deleted_at`, so no partial index, and keep the four stamp columns. The argument is rule 4's own — a service joining _through_ a soft-deleted join table would have to remember its filter by hand — and the rest of it is claude-docs/db/hard-delete-join-tables.md, "Hard delete on two join tables". **`spell_ingredients` is soft-deleted since MB.110**, keyed by a surrogate `id` so that it holds no depth, and read through by `existsIn`, which ANDs its filter by construction. `workspace_members` and `ingredient_folk_names` keep the full spread (DESIGN.md §5).

**The hard deletes.** The escape hatch is `write.delete(table, where)`, as DESIGN.md §5's fourth enforcement rule types it, named and narrow rather than a flag a later edit defaults wrongly. **One `users` delete sits beside it**: the provisional-account sweep (MB.67) hard-deletes lapsed unverified rows through the repository's named `deleteProvisionalUsers`, because Better Auth finds a user by address without our filter and a tombstone would go on blocking the owner. **So does one retirement delete**: `write.deleteLapsedSlugRetirements` (MB.82) hard-deletes the compendium's lapsed slug retirements on the next compendium write, since a redirect that has ended answers nothing.

## Rule 5 — the service check, and the `Membership` proof it returns

DESIGN.md §8 specifies the proof — `{ workspaceId, userId, role }`, branded, `write.insert` filling the column from it — and why the two layers are not redundant: the second makes a workspace-scoped query _unwritable_ without the first. Impossible, not merely absent — the sweep-task rule's own test.

M6.3 built it; M10.3 applies the same shape to spell `visibility`, and M5.2 to the site role — `assertSiteAdmin` returns a `SiteAdmin`, which the writer's three compendium-tier methods demand, each filling or ANDing `workspace_id IS NULL` itself as the workspace-scoped ones do the proof's workspace. The `permission` is a request against per-role statements, `{ spell: ['create'] }`, never a minimum role (DESIGN.md §8; argued in claude-docs/design-decisions/m6.3-permission-statements.md).

**Where it is weaker than a database policy** (DESIGN.md §8): a hand-written `where` naming another workspace's ids under a valid proof satisfies the type, and is caught by the direct-id denial tests `CLAUDE.md`'s Testing section requires, and by M6.6. A table with no `workspace_id` of its own takes the parent's shape instead: a `spell_id` table is refused by the unscoped finders and reached through `findManyInSpell` under the parent spell (M10.3), and `ingredient_folk_names` / `ingredient_categories` through `findManyOfIngredients` under the parent ingredient's tier (M4.8).

**RLS waits for the public launch** (MB.29, DESIGN.md §8 and §14): its migration's specification is claude-docs/design-decisions/mb.24-rls-role-split.md, superseded as a plan for v1 and intact as a plan for then.

## Rule 10 — migrations are expand/contract and forward-only

No down migrations exist in this repo. Destructive DDL (DROP, RENAME, type narrowing, NOT NULL additions) needs an explicit acknowledgement **sidecar beside the migration** — `src/db/migrations/<tag>.ack.md`, carrying a `Destructive DDL acknowledged: <reason>` line (MB.48). M1.5's check flags it, as the `checks / destructive-ddl` leg (MB.37), and an acknowledgement covers only the migration it sits beside: a release PR rescans every migration since the last release, and a PR-body line would be gone on merge and would bless every finding in the diff at once. "DROP" means any object — column, table, type, constraint, index; `DROP NOT NULL` and `DROP DEFAULT` widen and are exempt. Run it locally with `npm run check:destructive-ddl`, which scans what your branch adds.

**A column or index drop is two PRs, each its own task.** The first removes every code reference, the Drizzle schema included, and ships no migration; the second, once the first has deployed, is the `DROP` and its sidecar. Why a drop the live deploy still declares breaks it: claude-docs/db/expand-contract.md, "Expand/contract and the destructive-DDL check". Between the two, `db:generate` emits the drop on any branch — so do not run it there: the drop belongs to the second task, not to whoever ran it.
