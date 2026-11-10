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
  - 'scripts/db-generate.ts'
  - 'drizzle.config.ts'
---

# Database rules

The long form of `CLAUDE.md`'s architecture rules 2 to 5 and 10. `CLAUDE.md` carries each rule's binding sentence and wins over this file; `claude-docs/db/README.md` carries the argument.

## Rule 2 — only `src/db/repository/` may import the database client

A new importer fails `npm run lint` (`no-restricted-imports`). Inside the repository, five files run a query and carry the exemption: `write.ts`, `select.ts`, `provisional-users.ts`, `sign-in-failures.ts` and `passkeys.ts`. Callers import its `index.ts` (`@/db/repository`); a deep import of any other file fails lint (`no-restricted-imports`, and `sorrel/module-boundaries` for relative spellings).

Three files outside the repository are exempt, each by a named `oxlint-disable-next-line` at the import, because each needs a client rather than a writer: `src/lib/auth.ts` (Better Auth's `drizzleAdapter`), `scripts/db-seed.ts` and `tests/db/test-database-isolation.test.ts`. A test pins that set, so a fourth exemption is a decision, not a convenience.

`src/graphql/**`, `src/app/**` and `src/components/**` import nothing under `src/db` at runtime. Every file under `src/modules/*/services` opens with `import 'server-only'`, so a client component that reaches one fails the build; lint's `sorrel/service-server-only` fails a service without the marker. The `.oxlintrc.json` overrides follow the same lines (`src/modules/*/services/**/*.ts` is the services override; `src/modules/*/schema/**/*.ts` sits with `src/db/**`).

## Rule 3 — all writes go through `withAudit(session, fn)`

The actor goes out as `select set_config('app.current_user_id', $1, true)`, never a literal `SET LOCAL`. It goes out although only the privilege trigger reads it in v1, beside the privilege route and note that a write changing `users.role` or `users.can_create_workspace` declares; without them the trigger refuses the write (claude-docs/design/data-model.md, "Audit columns — on every table, and the join-table exception").

Every table spreads the six-column `...auditColumns`, except `ingredient_categories` and `spell_categories`, which spread the four-column `...auditStampColumns` (rule 4). The factories are in `src/db/audit.ts` (claude-docs/db/audit-columns.md).

**Reads open no transaction of their own.** A read carries identity in rule 5's `Membership` proof, so there is no read-side `withAudit`. The one read that opens a transaction is a trigram similarity read, which publishes no identity (claude-docs/db/fuzzy-matching.md, "Fuzzy matching: one index, and a rule every caller is bound by").

**A read inside a `withAudit` callback runs on that write's transaction**, found through an `AsyncLocalStorage` only `withAudit` enters (`src/db/repository/unit-of-work.ts`). No finder takes a transaction and the service holds no handle to it, so no write can skip `applyAudit` (claude-docs/db/write-path.md, "Reads inside a write"; claude-docs/design-decisions/data.md, "Reads on the write transaction").

**Writes outside the wrapper** (claude-docs/design-decisions/auth.md, "Two repository files that import the database client and write outside `withAudit`"). Two identity bootstraps have no session to hand over: `src/lib/auth.ts`'s sign-up hook (and the verification write, stamped through `databaseHooks.user.update.before`) stamps the row by hand and publishes no GUC; `src/db/seed/` stamps through `applyAudit` in the transaction it owns, writing through the handle it is given (claude-docs/design-decisions/data.md, "The seed writes through the handle it is given, not through `withAudit`"). The provisional-account sweep is that identity lapsing, not a third bootstrap (claude-docs/design-decisions/auth.md, "First-party email verification and email delivery"). Two repository files write tables with no audit columns: `sign-in-failures.ts` (a failed sign-in has no session to audit; claude-docs/auth/passwords.md, "Lockout") and `passkeys.ts` (removal under one lock with the last-way-in check).

**Two mutations are open to a signed-out caller, and both write through `withAudit`** as the seeded signed-out sender account, rate limited: `sendSignedOutSupportRequest`, and `replyToSupportRequestByViewToken`, which the mailed view token authorises (claude-docs/design-decisions/support.md, "The support feature, revised after review", claude-docs/design-decisions/support.md, "A signed-out sender reaches their request by a mailed link").

**`updated_at` is the database's.** One `set_updated_at()` trigger overwrites what `applyAudit` sends, while `updated_by` stays the session's. A new audited table adds its own `CREATE OR REPLACE TRIGGER` line in its own migration, and `tests/db/updated-at-trigger.test.ts` fails a table that forgets it (claude-docs/db/updated-at.md).

**A revisioned write.** A save that must not overwrite another person's goes through `write.updateRevisioned(membership, table, id, expectedRevision, values)` on a table carrying `revision`. A live row of the proof's coven that has moved on throws `StaleWrite`; `null` writes regardless; a row the proof cannot reach answers `[]`, never `StaleWrite`, which would tell another coven the row exists (claude-docs/autosave.md, "The server's half").

## Rule 4 — soft-delete filtering happens in the repository

A writer leaves a deleted row alone because the way back is v2's restore, then an ordinary edit (DESIGN.md §13). A unique index carries the predicate because without it, deleting a record permanently reserves its name.

### The named exceptions

Four finders reach past a tombstone. Each skips one named filter and no other, and `tests/guards/soft-delete-finder-guard.test.ts` pins them.

| Exception                                 | Finders                                                                                                                                               | Skips                                                                                         | Still held                                                                                                                                                                                                                  | Record                                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| What a spell holds                        | `findIngredientsInSpellsIncludingSoftDeleted`, `findManyOfSpellIngredientsIncludingSoftDeleted`, `findFormsInSpellsIncludingSoftDeleted`              | The ingredient's filter (and, for the forms finder, the form's)                               | The reader must be allowed to read the spell. A deleted form's categories need no hatch, because `ingredient_categories` has no `deleted_at` and a form's delete leaves its pairs.                                          | claude-docs/design-decisions/data.md, "A spell keeps the ingredients it holds, deleted or not"             |
| The ingredient a substitute links         | `findSubstitutesIncludingSoftDeleted` (behind `Ingredient.substitutes` and, through `of: 'ingredient' \| 'variant'`, `IngredientVariant.substitutes`) | The linked ingredient's filter                                                                | The substitute rows' own filter, the parent's (the ingredient, or the variant and its ingredient) and the parent's tier. The link's tier is held against its parent's.                                                      | claude-docs/design-decisions/ingredients.md, "A substitute is a row that links an ingredient or names one" |
| A co-member's name                        | `findCoMemberNamesIncludingSoftDeleted` (behind the `usersById` loader)                                                                               | The asked-about user's seat filter and row filter                                             | The viewer's own seat and the coven, through `existsIn`. It returns an id and a name, never the row. A removed member still counts.                                                                                         | claude-docs/design-decisions/auth.md, "A deleted co-member reads under their last name"                    |
| A compendium entry a cupboard still names | `findCupboardEntryIncludingSoftDeleted`, and three folder-internal finders (list in claude-docs/db/soft-delete.md, "The cupboard's internal finders") | The compendium row's filter, only while the proof's coven holds a live cupboard row naming it | The cupboard row's own tombstone and the compendium tier. The entry's forms, children and jars follow through `inUseIngredientParent` and `inUseVariantParent`, which take the same proof as an optional `heldBy` argument. | claude-docs/design-decisions/ingredients.md, "A retired entry stays readable to the covens that use it"    |

The guard pins each internal finder to the finders allowed to call it.

**Two writers touch a membership's deleted state without a proof** (claude-docs/db/write-path.md, "Writer contracts and filter fields"). `reviveMembership` clears `deleted_at` and `deleted_by` on a removed member's row (the primary key `(workspace_id, user_id)` is still held), sets the invited role and restarts `joined_at`; it matches deleted rows only. `setSeatRole` sets the role of a live member, because identity services seat an admin in the demo coven and hold no membership of it.

**Where a read is built.** `src/db/repository/select.ts` holds the two places a read query is built: `selectFrom`, and `existsIn` for a correlated subquery scoped by a parent row, which ANDs the parent's filter itself. The guard fails a third `.select(` in the folder or an `existsIn` without the filter.

**A `sql` fragment** means something a builder cannot say (a function call, an expression, a cast, a row value, `set_config`), or a rule keeping a whole statement raw. The comparison around one is still the builder's (`gt`, `lt`, `ne`, `inArray`). Check that a builder exists in `node_modules/drizzle-orm` rather than taking a task's word for it. Schema index predicates, `CHECK`s and defaults are DDL and exempt (claude-docs/db/repository-files.md, "What a `sql` fragment is for").

**Nothing outside the database layer may import `drizzle-orm` at runtime**, by the same `no-restricted-imports` entry as rule 2. `import type` stays legal everywhere.

**Hard deletes.** `ingredient_categories` and `spell_categories` are hard-deleted: they carry no `deleted_at`, no partial index and the four stamp columns, since a tombstone would keep nothing a re-toggle does not give back (claude-docs/db/hard-delete-join-tables.md, "Hard delete on two join tables"). `spell_steps` is soft-deleted, keyed by a surrogate `id`, and read through `existsIn`. `workspace_members` and `ingredient_folk_names` keep the full spread. The escape hatch is `write.delete(table, match)`: it names rows by column value (a list matches by `IN`; a service may not build an `SQL` predicate), an empty list deletes nothing, and a match naming no column throws. Two more hard deletes sit beside it: `deleteLapsedProvisionalUser` (Better Auth finds a user by address without our filter, so a tombstone would block the owner) and `write.deleteLapsedSlugRetirements` (a redirect that has ended answers nothing).

## Rule 5 — the service check, and the `Membership` proof it returns

DESIGN.md §8 specifies the proof (`{ workspaceId, userId, role }`, branded, `write.insert` filling the column from it) and why the two layers are not redundant: the second makes a workspace-scoped query _unwritable_ without the first.

`assertSiteAdmin` returns a `SiteAdmin`, which the writer's three compendium-tier methods demand, each filling or ANDing `workspace_id IS NULL` itself. The `permission` is a request against per-role statements, `{ spell: ['create'] }`, never a minimum role (claude-docs/design-decisions/auth.md, "Permission statements over a role rank").

**Where it is weaker than a database policy.** A hand-written `where` naming another workspace's ids under a valid proof satisfies the type; the direct-id denial tests catch it. A table with no `workspace_id` takes the parent's shape: a `spell_id` table is reached through `findManyInSpell`, and `ingredient_folk_names` and `ingredient_categories` through `findManyOfIngredients` (claude-docs/db/membership-proof.md, "Where the proof is weaker than a policy").

**Named exceptions take no proof.** There are three.

- **`rotateInvitationToken(invitationId)`** in `src/db/repository/write.ts`. The invitation mail's job step holds ids alone. It runs through `withAudit` as the System account, swaps a fresh token's hash onto a pending address invitation (never a card) and returns the plaintext token to the step only. It is on no `AuditWriter` method. `tests/guards/invitation-token-rotation.test.ts` fails if any file other than its definition, the repository index, `src/modules/identity/services/secret-link-mail.ts` and its own tests names it (claude-docs/design-decisions/auth.md, "The invitation mail mints its token in the job step").
- **`findWorkspaceMemberPauseForMail(pauseId)`** in `src/db/repository/workspace-member-pauses.ts` reads one live pause with the names the email needs; the mail job carries only the pause id (claude-docs/design-decisions/auth.md, "The coven pause mail step reads a pause without a Membership proof").
- **`findWorkspaceHoldingSlug(slug)`** in `src/db/repository/workspace-slugs.ts` reads the live coven that holds an address, current or old, and says whether it is the current one. Its writers (`insertWorkspaceSlug`, `updateWorkspaceName`) retire another coven's old-address row when a coven takes that address, without that coven's proof; they leave a current address alone. A request arrives with an address and no coven id, so no `Membership` can exist until this read has named the coven; the caller (`membershipBySlug`) then checks membership before saying anything about it (claude-docs/design-decisions/auth.md, "A coven address resolves without a Membership proof"). `tests/guards/workspace-slug-lookup.test.ts` fails if any file other than its definition, the repository index, `src/modules/coven/services/workspace-by-slug.ts` and its own tests names it.

**RLS (row-level security) waits for the public launch** (MB.29, DESIGN.md §8); its specification is claude-docs/design-decisions/auth.md, "RLS role split, `FORCE`, and identity on the read path".

## Rule 10 — migrations are expand/contract and forward-only

No down migrations. Destructive DDL (DROP, RENAME, type narrowing, NOT NULL additions) needs an acknowledgement **sidecar beside the migration**: `src/db/migrations/<tag>.ack.md`, with a `Destructive DDL acknowledged: <reason>` line (MB.48). The `checks / destructive-ddl` CI leg flags it. An acknowledgement covers only the migration it sits beside: a release PR rescans every migration since the last release, and a PR-body line would be gone on merge. "DROP" means any object; `DROP NOT NULL` and `DROP DEFAULT` widen and are exempt. `npm run check:destructive-ddl` scans what your branch adds.

**`src/db/migrations/meta/` keeps one snapshot, the newest journal entry's.** Generate with `npm run db:generate` (it runs `drizzle-kit generate` and deletes older snapshots), never a bare `drizzle-kit generate`; `tests/guards/migration-snapshots.test.ts` fails a second snapshot (claude-docs/db/migrations-and-scripts.md, "One snapshot").

**A column or index drop is two PRs, each its own task.**

1. The first removes every code reference, the Drizzle schema included, and ships no migration. A data fill it needs is `generate --custom`, which copies the last snapshot, so the undeclared column stays in it.
2. The second, once the first has deployed (to production too), is the `DROP` and its sidecar.

Between the two, `db:generate` emits the drop on any branch, so do not run it there. A table or column added in between is `generate --custom` as well, its DDL and snapshot entry taken from a `generate` run into a scratch copy of the migrations. The first PR adds each undeclared object to `PENDING_DROPS` in `tests/db/schema-drift.test.ts`; the second removes it. Why and how: claude-docs/db/expand-contract.md, "Expand/contract and the destructive-DDL check"; claude-docs/testing/db-harness.md, "The db test harness — `tests/support/db/`".
