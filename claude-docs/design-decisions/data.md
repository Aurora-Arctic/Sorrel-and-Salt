# Data decisions

The database layer and the repository, pagination, seeding, migrations, slugs, and the module boundary that holds them.

## Neon branch strategy: persistent staging vs. ephemeral hotfix branches

The task as written only asks for two Neon branches, `production` and
`staging`, with the Vercel integration injecting `DATABASE_URL` per
environment. In practice the project's default branch was never renamed off
Neon's own default (`main`) — every reference below to a `production` Neon
branch is actually `main`; only the Vercel environment is called
`production`. That undersells a real conflict: the Neon Vercel integration can
also automatically create a branch for every Vercel Preview deployment and
delete it when that deployment is torn down. `staging` and the per-PR hotfix
previews (`DESIGN.md`, "Configuration") are **both** Preview-environment
deployments, so the integration's automatic branching does not distinguish
between them by default — left as-is, it would try to mint (and eventually
reap) a throwaway branch on every `staging` deploy too, orphaning the
hand-created `staging` branch.

### Decided

- **`main` and `staging` are created by hand**, `staging` as a child
  branch of `main`. The task names the primary branch `production`; in
  practice it was created under Neon's own default name, `main`, and never
  renamed. These are permanent; nothing automated deletes them.
- **Hotfix previews get ephemeral, automatically-created Neon branches.** The
  integration's automatic branch-per-preview-deployment feature is left on,
  scoped to Preview deployments generally — this is what gives each
  `hotfix/<slug>` PR its own disposable database, deleted when the PR closes.
- **`staging` is shielded from that same automation with a branch-scoped
  environment variable**, added via the CLI (the dashboard's equivalent
  control is inconsistent across UI revisions):

  ```
  vercel env add DATABASE_URL preview staging
  ```

  This ties a `DATABASE_URL` value to Preview deployments from the `staging`
  git branch specifically. Vercel resolves a branch-scoped variable ahead of
  the environment-wide one the integration injects, so a `staging` deploy
  gets the pinned, persistent connection string while a `hotfix/*` deploy
  falls through to the integration's auto-created branch.

- **Add the integration first, then the override.** The branch-scoped
  variable is only meaningful once the integration has already injected a
  Preview-wide `DATABASE_URL` to override.

### Rules this sets

- Only `main` and `staging` are permanent Neon branches; any other
  branch existing in the project is an ephemeral hotfix preview and safe to
  ignore or manually delete if orphaned.
- A `staging` deploy's `DATABASE_URL` must always be the branch-scoped
  override, never the integration's generic Preview injection — if that
  override is ever removed, `staging` silently starts sharing (or losing)
  its database with the next hotfix branch's ephemeral one.
- Verify this exact behavior in the live dashboards before trusting it: a
  `staging` push must not spawn a new Neon branch, and a hotfix PR must both
  get one and lose it on close. Not yet verified as of this record — the
  project doesn't exist yet.

## The seed writes through the handle it is given, not through `withAudit`

**Status:** decided; superseded in part by MB.86 (2026-09-27), which removed the `users` ↔ `audit.ts` import cycle, so a seed file's import order no longer matters

CLAUDE.md rule 3 says every write goes through `withAudit(session, fn)`.
DESIGN.md's "Seed data — one module, three consumers" says the seed is
`seed(db, { scenario })`, handed a database handle by whichever of Docker,
Vitest or Playwright is calling it. `withAudit` writes through the one handle
`src/db/connection.ts` builds and takes no other, so the two cannot both be
honoured literally: either the seed ignores the handle it was given, or it
writes outside `withAudit`.

### Decided

**The seed writes through its handle.** `seedMinimal(db)` opens one
transaction on `db`, publishes `app.current_user_id` with the same
parameterised `set_config(…, true)` that `withAudit` uses, and produces every
audit stamp by calling the same `applyAudit` helper `withAudit` calls. What
rule 3 guarantees — one transaction, the acting user published, stamps that
cannot be hand-written wrongly — is kept; only the wrapper is not.

The acting user is the bootstrap user itself, `BOOTSTRAP_USER_ID`
(`src/db/bootstrap.ts`, MB.5). With the session's `userId` and the row's `id`
set to the same value, `applyAudit('insert', …)` yields the single
self-satisfying statement TASKS.md's fourth criterion asks for, and every
other seeded row is created _by_ that user.

### What makes this safe

- **The seed cannot hold any other handle.** `src/db/seed/` is not one of
  the four files allowed to import `connection.ts`
  (`tests/guards/lint-db-client-boundary.test.ts` pins that set), so the handle it
  is given is the only one it can write through. That is enforced by lint,
  not by the seed's test.
- **It is the same shape as the one existing exception.** `src/lib/auth.ts`'s
  sign-up hook already writes outside `withAudit` for the same reason: it is
  how an identity comes to exist, so there is no session to hand over. Both
  are identity bootstraps; both stamp the row as its own creator; neither is
  a request. Rule 3 now names them together.
- **The seed's test observes the guarantee, not the wrapper.** An `AFTER
INSERT` trigger on `users` records what `app.current_user_id` held inside
  the seeding transaction, so "published as `withAudit` would" is a row read
  back, the same trick `tests/db/repository/write.test.ts` uses for M1.19.

### Two things the decision surfaced

- **`seed()`'s declared handle type rejected the real handle.** The M1.3
  stub took a bare `PostgresJsDatabase`, whose schema parameter defaults to
  `Record<string, never>`; `drizzle(client)` returns
  `PostgresJsDatabase<Record<string, unknown>>`, which is not assignable to
  it. `scripts/` is outside `tsconfig.json`'s `include`, so
  `scripts/db-seed.ts` never typechecked its call. `SeedDatabase` in
  `src/db/seed/types.ts` is the widened type.
- **A script on bare Node cannot resolve an extensionless relative import
  inside `src/`.** Node's type stripping strips syntax and changes nothing
  about resolution; the stub had no relative import, `minimal.ts` has
  three, and `audit.ts` ↔ `schema/users.ts` more behind them. `db:seed` now
  runs through `tsx` — the one script that executes app code, on the
  standard loader for that. Rejected: `.ts` extensions across `src/db`, a
  spelling convention with nothing but `db:seed` to guard it (and it cannot
  be confined to the seed folder, since the schema modules it reaches import
  each other extensionless); and a `module.registerHooks` resolve hook
  preloaded via `--import`, which works and needs no dependency but is
  fifteen lines of loader API to explain for what one package does plainly.

### Rules this sets

- A seed scenario writes through the handle `seed()` receives, stamps via
  `applyAudit`, and publishes `app.current_user_id` first. M1.22 and M1.23
  follow `minimal.ts`'s shape rather than reaching for `withAudit` or for a
  handle of their own.
- Import `schema/users` (any schema module) **before** `audit` in a seed
  file. The two import each other, and entered via `audit.ts` the `users`
  table is built while `auditColumns` is still undefined — the insert then
  carries no `created_by`. Every db test under `src/db/` already orders them
  this way; `minimal.ts` says why at the import. (Superseded by MB.86: the
  cycle is gone, and neither order is load-bearing.)
- A third write path outside `withAudit` is argued for here, beside these
  two, not added quietly.

## Cursor pagination helper with a hard maximum page size

**Status:** decided. Live home: `claude-docs/db/keyset-pages.md`; the code is `src/lib/pagination.ts`, `src/graphql/pagination.ts` and `findPage` in `src/db/repository/`.

### Decision

- **Three layers, each respecting rules 1, 2 and 4.**
  - `src/lib/pagination.ts` is pure (no drizzle, no graphql) so both sides import it. It holds `DEFAULT_PAGE_SIZE = 25`, `MAX_PAGE_SIZE = 100`, `pageRequest(args)` (wrapping `@pothos/core`'s `parseCursorConnectionArgs`, which clamps to the max and rejects a negative size), the `PageRequest` type (`{ after?, before?, limit, inverted }`) and the cursor codec: base64url of `{"k": <sort key as text>, "i": <id>}`. A malformed cursor is refused with a user-facing error, never read as "from the start".
  - The repository has `findPage(table, sortColumn, page, where?)` and `findPageInWorkspace(membership, table, sortColumn, page, where?)`. The keyset is `(sort, id) > (k, i)` (`<` when inverted), `ORDER BY sort, id` (desc when inverted), `LIMIT limit` (the page size plus one). Soft-delete and workspace predicates are ANDed as in `findMany`. It goes through the one private `selectFrom`, so the soft-delete guard's single-select invariant holds; `findPageInWorkspace` joins `SCOPED_FINDERS`.
  - `src/graphql/pagination.ts` adds `t.pagedConnection`, wrapping `t.connection`. Its `resolve` receives a parsed `PageRequest` and returns `{ cursor, node }[]`; the wrapper trims the extra row, reverses when inverted and builds `edges` and `pageInfo`. A resolver never sees the raw `first`, so the clamp cannot be skipped.
- **The sort key is selected as `sort::text` in SQL and compared back in SQL.** A `timestamptz` keeps its microseconds; a JS `Date` would truncate to milliseconds and repeat or skip rows.
- **`sortColumn` is typed to NOT NULL columns**, because a NULL breaks row comparison.
- **`t.pagedConnection` is a method added to `RootFieldBuilder.prototype`**, as the Relay plugin adds `t.connection`. A free function `pagedConnection(t, …)` gave TypeScript an "excessively deep" instantiation. The pagination guard scans for `.connection(`.
- **`InvalidCursor` (`src/lib/errors.ts`)** is thrown by the repository for a cursor that will not cast to the sort column's type (SQLSTATE class 22); `t.pagedConnection` turns it into an `Invalid cursor` GraphQL error.
- **`MAX_COST` (5000) lives in `builder.ts`**, beside the complexity plugin that enforces it. A connection spends two depth levels on `edges` and `node`, so route-level cost tests use two nested connections from the root, which reach exactly depth 7.
- **A page finder for another table is adopted per PR by the task that needs it**, not speculated.

### Why

Every list must have a hard cap so the client never holds a whole table, and the cap must live where a resolver cannot skip it.

### Rules out

- A resolver reading raw `first`.
- A nullable sort column.
- A `Date`-typed sort key.

## A spell keeps the ingredients it holds, deleted or not

M5.3 set out to prove that a keeper's soft delete takes a compendium entry out
of every read. Reviewing it widened the question to both tiers, and to the one
place where "out of every read" is the wrong answer: a spell. CLAUDE.md rule 4
said no exported finder may return a deleted row. For a spell that rule is
wrong, and this record is the correction.

### Decided

**A spell is a recipe, so what went into the jar stays in it.**
An ingredient soft-deleted after a spell holds it — by a keeper curating the
compendium, or by the coven tidying its own ingredients — is still in the
spell. It is shown as it was, its categories still feed the spell's derived
categories and category gaps, and its safety notes still warn. Deleting an
ingredient is a statement about the coven's ingredients from now on, not a
retraction of a jar someone already made.

**The data already held it; the reads did not.** `spell_ingredients` points at
the ingredient row with a `NO ACTION` foreign key, and a soft delete touches no
layer. What lost the ingredient was every read: `findOneIngredient` and
`findManyByIds` filter a deleted row, and `findManyOfIngredients` reads a
child through `existsIn`, which filters a deleted parent by construction. So the
correction is a read, not a schema change.

**A named exception, not a flag.** Two finders in `src/db/repository/spells.ts`
— `findIngredientsInSpellsIncludingSoftDeleted` and
`findManyOfSpellIngredientsIncludingSoftDeleted` — end in the escape hatch's
suffix, so the call site says what it is, and the soft-delete guard pins them
as a list rather than admitting a third quietly. A `{ includeDeleted }` flag on
the existing finders was the alternative, and is what rule 4's hatch already
argued against: a flag is a default a later edit gets wrong.

**Only the ingredient's tombstone is skipped.** The spell must be readable and
live, the layer live, and the ingredient in the compendium or the proof's
coven. The last is new ground: a layer's foreign key checks the id alone, so a
W spell linking X's ingredient is a row the schema accepts, and the finder is
where it is withheld. A child's own tombstone still filters — a folk name
removed before the ingredient was deleted stays removed. The guard's last test
holds the two finders to exactly that.

**Built now, ahead of its caller.** Nothing reads a spell's layers until
Wave 13, the grimoire wave (M10.5, M10.9). Building the finders in the task that
changed the rule means Wave 13 adopts a finished mechanism instead of each task rediscovering
that the ordinary reads drop a deleted ingredient.

**A form deleted on its own stays too** (added by M10.9, 2026-10-27). The
same holds one level down: a step names the form it laid, and deleting that
form alone must not blank the step. `findManyOfSpellIngredientsIncludingSoftDeleted`
keeps a child's own tombstone, so read through it a deleted form dropped out
and the step's form read null. A third finder,
`findFormsInSpellsIncludingSoftDeleted`, reads the forms of the held
ingredients and skips the form's own filter and no other: the ingredient is
still read through `findIngredientsInSpellsIncludingSoftDeleted`, with all its
checks. The step view marks the form `deleted`, as it marks the ingredient. A
deleted form's categories needed no change: `ingredient_categories` has no
`deleted_at`, and a form's soft delete leaves its pairs, so they already
counted towards derived categories. The guard pins the three finders as one list.

**A layer leaves a spell only by a user's choice, and then softly.** Removing
an ingredient from a spell is a user editing a record, and it should be
recoverable like every other delete. `spell_ingredients` was hard-deleted under
MB.34; MB.110 gave it a `deleted_at`, as a table task of its own, and the
finders here needed no change: they read the layer through `existsIn`, which
filters a removed layer as soon as the column exists.

**Editable, with history in v2.** A spell stays editable: a layer already
linking a deleted ingredient survives a save, and a new layer cannot link one
(a criterion on M10.10). The history of those edits is v2's (DESIGN.md §13).
There the direction is set: a layer references the exact revision of its
ingredient, the spell indicates when the ingredient has been modified since,
and the user can pull that precise modification into the spell, as a new
revision of the spell rather than a silent change to it.

### Ruled out

- **Cascading the delete into spells.** It would rewrite records of workings
  nobody asked to change, and a hard-deleted layer would take its note and
  quantity with it.
- **Copying the ingredient into the layer on delete.** A snapshot column set on
  `spell_ingredients` duplicates `ingredients`, and v2's revision pinning is
  the general form of the same idea.
- **Filtering after the fetch.** Reading the deleted rows through the generic
  hatch and dropping the ones the caller may not see would put another coven's
  ingredient, or a private spell's, into memory first (CLAUDE.md rule 7).

## A coven's members are read a coven at a time, without a loader

The owner's call, made while building M6.11. The task asked for a
`membersByWorkspace` DataLoader behind `Workspace.members`, batching member
lookups across every coven a request lists. `Workspace.members` was built
without one: its service reads one coven's page per call. The result is in
[`graphql/schema.md`](../graphql/schema.md), DESIGN.md §7, and the M6.11
entry in [`tasks/m6.md`](../tasks/m6.md), which now asks for what was built.

### What the loader would have bought

A loader batches the lookups a single request makes. Only one query shape
asks for more than one coven's members at once: `me → memberships →
workspace → members`. No v1 page sends it:

- **The members page doesn't use GraphQL to load.** `/coven/[slug]/members`
  (M6.13) is a server component, which calls services directly (CLAUDE.md
  rule 1), and no page builds loaders, which exist only in the GraphQL
  request context.
- **The page shows one coven.** Nothing in DESIGN.md §9 lists two covens'
  members side by side.
- **The query is over the depth limit anyway.** Through `me`, a member's
  name sits eight levels down, one past the limit of seven
  ([`graphql/protections.md`](../graphql/protections.md)).

The N+1 a members list does risk is one read per member for their name. MB.10's
`usersById` loader already removes it: the names on a page of members are
one read.

### What it would have cost

`Workspace.members` is a paged connection (CLAUDE.md rule 8), so the loader
would have had to batch _pages_, not rows. That needed two pieces the
repository doesn't have:

- **A batched membership check.** Each coven needs its own `Membership`
  proof (rule 5). Minting several in one query needs a plural
  `findWorkspaceRole`, a third read without a proof, which the repository's
  comments say is a decision rather than an addition.
- **A partitioned keyset page.** One statement paging every coven separately,
  using `row_number() over (partition by workspace_id …)` against each key's
  limit and cursor: a new variant of `selectFrom`'s keyset read.

That was estimated at five to six hours against the task's two, for a query
no page sends.

### The options

| Option                           | What it reads per request                          |
| -------------------------------- | -------------------------------------------------- |
| **No loader, a coven at a time** | Per coven listed: a role check, a page, the names  |
| The loader as specified          | One check and one page per distinct page arguments |
| A loader batching only the check | Per coven listed: a page; still not batched        |

The owner chose the first.

### What was built

- `listMembers(session, workspace, page)` in
  `src/modules/coven/services/members.ts` checks `member: read` and reads one
  page through `findMemberPage`.
- `findMemberPage` in `src/db/repository/memberships.ts` pages a coven's live
  seats in `(joined_at, user_id)` order. `workspace_members` has no `id`, so
  the user id breaks ties, and `selectFrom` now reads the tiebreak from
  whichever column the keyset names rather than from `row.id`.
- `WorkspaceMember.user` is a `CoMember`, an id and a display name through
  `usersById`, with no email field.

A request listing several covens' members reads the names once per coven, since
each coven's page resolves on its own tick, and never once per member.
`tests/modules/coven/graphql/workspace-members.test.ts` holds that count.

### When to revisit

If a page comes to list several covens' members at once, through GraphQL,
the two pieces above are what a loader needs, and this record is the
starting point.

## Correlated subqueries go through `existsIn`, not raw SQL

**Status:** decided. Live home: `claude-docs/db/soft-delete.md`, "Soft-delete filtering and the partial-index convention"; the code is `existsIn` in `src/db/repository/select.ts`.

### Decision

- **The rule's purpose stays: no read leaves `select.ts` unfiltered.** Its mechanism changes from "exactly one `.select(`" to two named bodies.
- **`existsIn(table, where): SQL` in `select.ts`** is built on the same `db` and ANDs `notSoftDeleted(table)` itself. It returns `SQL`, not a builder, so a caller cannot add `.limit` or execute it. `notSoftDeleted` returns `undefined` for a table without the column (`accounts`, join tables) and `and()` drops it. `existsIn` joins `INTERNAL`, so the repository index can never re-export it.
- **`tests/guards/soft-delete-finder-guard.test.ts` counts two `.select(` calls, both in `select.ts`, one in `selectFrom` and one in `existsIn`**, and asserts `existsIn`'s body contains `notSoftDeleted(`.
- **Correlated `EXISTS` subqueries use `existsIn`** (`findManyInSpell`, `findMembershipsOfUsers`, `findManyOfIngredients`, `deleteProvisionalUsers`), not a raw `sql` string.
- **What stays raw:** `Derived` sources and `union all` arms (pg_trgm, `mode() within group`, window functions). There is no builder for those, and `selectFrom` already reads a `Derived` through its one call.

### Why

The guard cannot see inside a string, so the raw subqueries were the least-checked reads in the folder: each remembered its own `notSoftDeleted` or `readableSpells` by convention, and the comment citing the guard as the reason for the string was the rule producing what it was meant to prevent. Drizzle's `exists(subquery)` takes an un-executed `db.select().from(t).where(…)`, which renders as `(select …)`, and correlates because Drizzle qualifies columns by table. The filter becomes enforced by construction.

### Rules out

- Raw `exists (select 1 from …)` strings in finders.
- Returning a builder from `existsIn`.

## The pager counts, and the typeahead is the first page of a search

**Status:** decided. The mechanism lives in `claude-docs/graphql/pagination.md` and `claude-docs/db/keyset-pages.md`.

### Decision

A paged connection gains `totalCount` (rows under the filter) and `countBefore` (rows before this page's first edge, 0 on the first page). `countBefore` uses the page's own row comparison; it is derived from a key and never used to seek, because a cursor is never an offset. The pager reads "Page X of Y" with First, Previous, Next and Last links.

The search box's typeahead is `compendium(query:, first: 25)`: the first page of the ranked search, not paginated by the dropdown, which follows no cursor. `pageInfo.hasNextPage` says when to offer "See all results", and the dropdown is always exactly what "See all" opens on.

### Rules out

- `startIndex`: a client may read it as one-based. The field is named as a count, `countBefore`.
- A `nodes` shortcut: it saves one nesting level, the search score lives on the edge so a search view still needs `edges`, and it would need the same pricing override or the cost limit counts the page twice.
- An exact `hasPreviousPage` on a forward walk (and the mirror case): the specification permits Pothos's "a cursor was given" answer and no pager needs more.
- A count alone ("287 ingredients · 12 pages"): it never says which page is showing.
- Numbered jump links: they need the cursor opening every page, which ranks every matching row on every request, ties the pager to one page size and adds a second way to navigate. They remain possible later on top of `countBefore`.
- A separate typeahead query, a plain `[Ingredient!]!` field capped by the API: it needs a `t.typeahead` helper, an exception to the pagination rule and guard, and a follow-up moving the autofill queries over, to buy an API that cannot be paged.

## `write.delete` names its rows by value, and the join tables stay hard-deleted

MB.125 is the first service to remove an `ingredient_categories` pair, and
found the writer's hard delete uncallable from where it is needed. The owner
settled two things while it was built: how `write.delete` takes its rows, and
whether the two category join tables should stay hard-deleted at all. DESIGN.md
§5 ("Audit columns — on every table, and the join-table exception") and §14
carry the results; this record carries the alternatives.

### Decided

**`write.delete(table, match)` takes column values.** `match` maps each column
to a value, or to a list the column must be in:
`write.delete(ingredientCategories, { ingredientId, categoryId: [...] })`. A
list left empty deletes nothing without a statement; a match naming no
column, or a key that is not one of the table's columns, throws. The type
constraints MB.34 gave the method — no `deleted_at`, no `workspace_id` — are
unchanged, and the writer keeps its twenty methods.

- _Why not keep `where: SQL`:_ a service may not import `drizzle-orm` at
  runtime (MB.33), so it cannot build the predicate. Until MB.125 the
  method's only callers were tests — MB.33 had made MB.34's escape hatch
  unreachable from the code it was written for.
- _Why not a named `deleteIngredientCategories`:_ `tests/db/repository/write.test.ts`
  treats a twenty-first writer method as a decision, and every named one so
  far exists because the generic methods could not or should not reach its
  table. Here the generic method already reaches the table and is typed for
  it; only its parameter was wrong. A named method would have papered over
  that, and `spell_categories` would have needed a second one.
- _Why only equality and `IN`:_ both hard-deleted tables are keyed on their
  pair, so naming rows by value covers every delete either needs, and the
  hatch is narrower than an arbitrary predicate.

**`ingredient_categories` and `spell_categories` stay hard-deleted** (MB.34
stands). MB.34's deciding argument was the `deleted_at IS NULL` a service
joining _through_ a soft-deleted join table would have to remember by hand.
`existsIn` (MB.100) has since ANDed a child's filter by construction for every
read through it, which is what let MB.110 soft-delete `spell_ingredients` — so
that argument no longer decides it. What does: a pair is a pairing, not
content. It holds no locator, position or typed text, so a removed pair is
restored by toggling the chip again, and a tombstone keeps nothing a restore
could return.

- _Why not soft-delete them now:_ it would buy a `deleted_by` on the row and
  one idiom across an ingredient's child writes. It would cost a surrogate
  key, partial unique indexes, the two delete columns, the `updated_at`
  trigger line and a destructive migration, for a row whose restore is a
  click. The v2 history trigger sees a `DELETE` with `app.current_user_id`
  beside it, so the actor is not lost.
- _Why `spell_ingredients`' reversal does not reach them:_ a layer is a record
  of a working (MB.110); an ingredient's or a spell's categories are a
  classification, corrected rather than kept.

**A pair whose category is soft-deleted survives a save.** `categoriesOf`
does not show it, so the form never sends it back, and `replaceCategories`
compares only the pairs it shows — as `replaceReferenceLinks` leaves a link to
a soft-deleted reference for a restore to return.

## Reads on the write transaction

**Decided:** `withAudit` publishes its transaction through an `AsyncLocalStorage`, and `selectFrom` runs on that transaction when one is present and on the bare client otherwise. No finder's signature changes and a service gets no handle to the transaction. The summary is [`db/write-path.md`](../db/write-path.md), "Reads inside a write".

### The cycle being closed

`withAudit` opens a transaction and hands its callback a writer bound to it. A finder called inside the callback went through `selectFrom` on the bare client, which takes a second pool connection. With such a read in flight, an `ALTER TABLE` queued behind the open transaction blocks the read, and the read blocks the commit the `ALTER` waits for. Postgres cannot detect the cycle, because one leg is the application waiting rather than a lock, and nothing here sets a timeout. The same cycle hangs a test's `truncate` behind an unfinished write. Three reads did this, all in `src/modules/ingredients/services/ingredient-rows.ts`: the current rows `replaceFolkNames` and `replaceSubstitutes` diff against, and `refuseUnlinkable`'s link check.

A read on a fresh connection also finds `app.current_user_id` unset. Under the deferred row-level security policies ([`mb.24-rls-role-split.md`](mb.24-rls-role-split.md)) every read inside a write would answer nothing, which is the re-audit of write paths that publishing the setting early (M1.19) was meant to spare.

### Why a context-bound store

The alternative is an explicit reader on the writer. It takes one of two forms, and both cost more than they buy:

- **A parameter on every finder** for a transaction to run on, which grows every finder's signature for three call sites.
- **The finder surface duplicated on `AuditWriter`**, which grows the writer, whose method count `write.test.ts` pins.

The store is held in `src/db/repository/unit-of-work.ts`, which exports a getter and a runner and never the store. Only `write.ts` and `select.ts` import it, and only `withAudit` calls the runner, with `run` and never `enterWith`, so the context ends with the callback. `tests/guards/unit-of-work.test.ts` pins all of that. A service still cannot reach the transaction, so no write can skip `applyAudit`.

### The cheaper fix, not taken

Read the current rows before the transaction opens, as the repository does elsewhere with the unique index arbitrating a race. It loses read-your-own-writes, since a read cannot see the write's earlier statements. It also keeps the diff racy: the rows can change between the read and the write.

### MB.29's line, read correctly

MB.29 retired the read-side `withViewer` wrapper, and DESIGN.md §14's row says reads open no transaction "to carry identity". That means a read carries identity in the `Membership` proof and opens no transaction of its own. It does not mean a read never joins one. CLAUDE.md rule 3 now reads "Reads open no transaction of their own", and §14's row says the same.

### The savepoint for similarity thresholds

A similarity read sets `pg_trgm.similarity_threshold` and `pg_trgm.word_similarity_threshold` with `set_config(…, true)`, so they end with the transaction that set them. Outside a write that is a transaction opened for the read. Inside a write, ending the write's own transaction is not on offer, and leaving the thresholds set would carry them into the write's later statements. So the read runs in a savepoint (`tx.transaction`) on the write's transaction: the thresholds end when the savepoint releases, and a write holding one still rolls back whole when its callback throws. [`db/fuzzy-matching.md`](../db/fuzzy-matching.md) has the thresholds.

### Not changed

Locked reads (`lockIn`) already take the writer's transaction explicitly and are untouched. `existsIn` only builds SQL. `passkeys.ts`, `sign-in-failures.ts` and `provisional-users.ts` keep their exemption to use the bare client, as they write or read outside `withAudit`.

## A seeded row keeps the key the seed gave it

MB.156 was to seed the vocabulary docs' sources as `references` rows,
idempotent by the rendered citation. Scoping it, the owner asked what a reseed
does to a seeded reference a keeper has since edited. The answer was that it
no longer recognises the row and inserts the original again as a twin, and
that every vocabulary seed has the same gap: they key by slug, the slug is
derived from the name, and M5.6, M5.6a, M5.6b, MB.95 and MB.132 all rename a
row and re-slug it. `deploy.yml` reseeds whenever a push touches a seed file,
so the twin arrives on the first such deploy after the edit. The owner chose a
stable key on every seeded row, for every data type this can happen to.
The build is MB.171 (the column), MB.172
(the vocabulary seeds keyed on it) and MB.156 (the sources seed, keyed from its
first row). DESIGN.md §5, "`seedKey`", carries the model; this record carries
the alternatives.

### Decided

**Each seeded table carries `seed_key`, the identity the seed gave the row at
insert, never changed after.** A vocabulary row's is its slug at insert; a
reference's is the citation the seed rendered. A row a keeper or a member
writes holds null. A partial unique index covers live keyed rows, as rule 4
asks of every unique index. Nothing outside `src/db/seed/` writes it, and no
input, service or GraphQL field names it.

The four options put to the owner:

- **A, accept the twin and document it.** This is how the vocabularies already
  behave: simple and exact, with no schema change. But a twin carries the
  original's links, sits beside the edit until a keeper notices it and
  soft-deletes it, and nothing flags it.
- **B, skip a source whose rows already carry links.** No schema change, but
  it guesses. It would silently skip a genuinely new source added for an
  already-sourced deity, which is the commonest reason to touch the seed. A
  missing source is worse than a visible twin, because nothing shows it.
- **C, a stable key on each seeded row — chosen.** The seed recognises its
  own row whatever a keeper did to it, never twins, and still adds what is
  new. It costs a seed-only column on nine domain tables, and three PRs where
  there was one.
- **D, run once.** It never twins, and it never delivers a later addition to a
  doc either, which defeats the deploy's reseed.

**Why a column rather than a ledger table.** A table of `(table, key, row
id)` would keep the domain tables clean, but its row id could point at no
foreign key, since it spans nine tables. The column needs no integrity of its
own and travels with the row.

**Which tables.** Only the ones `migrate.yml` seeds on a deployed database:
`category_groups`, `categories`, `ingredient_form_groups`,
`ingredient_forms`, `planets`, `zodiac_signs`, `deity_traditions`,
`deities` and `references`. Two kinds of seeded row are left out:

- The scenarios (`minimal`, `standard`, `demo`) run on fresh local and test
  databases only, and key by fixed id.
- `reference_links` is keyed by its two ids, which no edit changes.

**The backfill is exact.** `0045_seed-keys` keys every row the bootstrap user
created by its slug. No rename writer had shipped, so every such row still
carries the slug the seed gave it. `references` holds no seeded row yet.

**What a reseed takes as present** (MB.172, MB.156) is a matching key, live
or soft-deleted. It also takes as present a live row holding the slug, so a
row a keeper created under a seed name does not trip the slug index.

### What it changed

- DESIGN.md §5 names `seedKey` on the nine tables and §14 records the
  question. `db/seed-module.md` gains "Seed keys".
- MB.171 and MB.172 were minted. MB.156 is amended to key on the column, and
  re-estimated to 6h for the doc normalisation it also carries.
- `db/expand-contract.md` records `0045_seed-keys` as a column added while
  MB.168's drop was pending.
- MB.241 later widened the set to `ingredients`, for the compendium seed
  (MB.242), in migration `0065_ingredients-seed-key`.

## A renamed table leaves a view under its old name

**Decided:** `planets` is renamed `celestial_bodies` in one migration, `0067_celestial-bodies-expand`. A view named `planets` over the new table serves the deploy that is still running. The table's indexes, its CHECK and its foreign keys take the new name in the same migration. The pattern for the next table rename is in [`db/expand-contract.md`](../db/expand-contract.md), "Renaming a table".

### The question the task asked first

This is the first table rename in the repo. Rule 10 needs every migration to work under both the new code and the code before it. `migrate.yml` runs before `deploy.yml` promotes, so the code before always meets the renamed table: for the minutes the rollout takes, and again after any rollback. The task's entry asked whether a view under the old name serves every statement that code sends.

### What was measured

- **The whole `db` test project, against the migration, with the code unchanged.** The migration was applied and the Drizzle schema still named `planets`, so every statement went through the view. 1240 tests passed and 10 failed. Seven of the failures were the catalogue tests the entry predicted. The other three reached the database by the old table's name: two read the catalogue or `ctid` through the view, and one looked for an index under its old name. Every service, GraphQL resolver, seed, reference link, trigram search and in-use count passed.
- **Statements prepared before the rename.** postgres.js prepares statements by default, so a running deploy holds prepared statements that name the old table. A scratch script prepared a `SELECT`, an `INSERT … RETURNING` and an `UPDATE … RETURNING` against the table, renamed it, created the view, and ran them again. All three worked, and so did a soft delete. Postgres looks the name up again when it re-plans a statement, and the result columns are unchanged.
- **What the code sends.** Nothing that touches `planets` uses `ON CONFLICT`, `FOR UPDATE` or `TRUNCATE`. The seed only inserts rows it is missing.

So the answer is yes. Postgres can write through a view over one table, and the table keeps its `set_updated_at` trigger through the rename, so writes through the view are stamped as before.

### The index names move now, not in MB.253

The entry first kept the four index and CHECK names (`planets_seed_key_unique`, `planets_slug_unique`, `planets_trgm`, `planets_description_not_blank`) until MB.253. The reason: the vocabulary service turns a unique violation on `planets_slug_unique` into a friendly "name taken" error, and the code before MB.252 knows only that name.

Keeping them would have cost:

- `slugIndex` accepting two names, a type change in the shared vocabulary services
- `vocabularies.test.ts` reading one table under a different name prefix
- a second rename migration and sidecar in MB.253, and the work to undo the two-name mapping

Renaming now costs one message. During the rollout, and after a rollback to the earlier deploy, a keeper adding a duplicate celestial body sees a generic error instead of "name taken". The duplicate is still refused, by the same index under its new name, and the screen is admin-only. The owner chose to rename now.

### What it leaves for MB.253 and MB.254

- **MB.253** moves the code and GraphQL names and every reader and writer onto `celestial_bodies`, `ingredients.celestial_bodies`, `ingredient_variants.celestial_bodies` and `reference_links.celestial_body_id`, refilling them for what the deploy before wrote in between.
- **MB.254** drops the old columns and the `planets` view, and counts `celestial_body_id` alone in `reference_links_one_row`.
- **Until MB.254, the view locks the table's columns.** Postgres refuses `DROP COLUMN` and `ALTER COLUMN TYPE` on any column a view reads.

## The repository is a folder

**Status:** decided. Live home: `claude-docs/modules.md` and `.claude/rules/database.md`.

### Decision

`src/db/repository.ts` became `src/db/repository/index.ts` plus files carved out of it, with `index.ts` as re-exports and a lint pattern that keeps the database client inside the folder. The soft-delete, module-boundary, client-boundary, access-boundary and doc-citation guards read the folder shape. Its test file was split too, with a shared `probe-tables.ts`.

### Why

One file past a size where every task touched it; guards go red first, so the move cannot loosen a rule.

### Rules out

- Moving the code before the guards fail against the single file.

## Backend DRY review

**Status:** decided. Live home: `CLAUDE.md`, "Non-negotiable architecture rules"; the shared helpers are in `src/lib/validation.ts` and `src/lib/citation.ts`.

### Decision

- **A DRY refactor is pure unless its entry says otherwise.** The service, repository and validation tests are the proof and stay green. A test that has to change is a behaviour change and is named in the PR body.
- **Constraints a refactor keeps:** authorization in services with the `Membership` or `SiteAdmin` proof taken first; only `src/db/repository/` imports the client and only `select.ts` and `write.ts` build queries; no `drizzle-orm` at runtime above the repository; every list through `t.pagedConnection` and `findPage`; loaders through `define-loader.ts`; types in type-only files (`tests/guards/types-in-type-files.test.ts`); modules reach each other through `@/modules/<name>` only; every service opens with `import 'server-only'`. Migrations are forward-only, so no column or index is renamed to tidy a schema.
- **A new helper file inside a module is not re-exported from the module's index** (`group-moves.ts` and `held-entries.ts` are the precedent) unless another module needs it.
- **Mechanism plus guard where a guard is cheap**: the soft-delete finder guard's regex widens for each new predicate name in the same PR, and a lint `no-restricted-syntax` entry keeps the session narrowing out of resolvers once `sessionOf` exists.
- **Coverage must not drop per touched `src/` directory**, compared in `.reports/coverage/coverage-summary.json` before and after.
- **Validation has one of each shared piece.** `src/lib/validation.ts` holds `requiredText(message)`, `optionalText()` and `curatedValueInput(noun)` (the six name-and-description pairs); no validation file declares its own `requiredText` or hex or day regex. Ids use `RowId = z.guid()`, never `z.uuid()`, because a hand-written fixture id fails `z.uuid()`. The link-or-name rule is one `linkOrNameRules(field, idKey, messages)` with `LinkOrName<IdKey>` types in `validation/types.ts`, and the case-folded seen-set loop is written once. `ReferenceTextField` is `Exclude<keyof CitationFields, 'kind'>`, `REFERENCE_TEXT_FIELDS` is exported from `reference-format.ts`'s `FORMAT_OF`, and `ISO_DAY` and the quotation-mark set live in `lib/citation.ts`. `lib/contrast.ts` exports `HEX_COLOR` and `channels`.

### Why

A hidden behaviour change inside a refactor is unreviewable, so the existing tests are the fixed point. `z.uuid()` in the category, deity and form-value validators was a bug: it rejected ids that `RowId` accepts.

### Rules out

- Renaming a column or index to tidy a schema.
- Re-exporting a module-private helper from its index.
- Per-file copies of `requiredText`, hex or day regexes.

## Take the new version (PR #1542): turn off the new read mode, and enforce channel binding

### Context

PR #1542 is Dependabot's bump of the `postgres` package (postgres.js, our Postgres driver) to its next major version. CI fails 223 tests in 16 files, all with `Error: read ENOTCONN`.

- **Why:** the new major version opens an unencrypted connection in Node's custom read mode (`onread`) by default. msw, the library that fakes outside web services in tests, intercepts every socket, including database ones. Its passthrough swaps in a socket that ignores that read mode, so the first read fails.
- **The same fault can make tests flaky:** a pool that opens a second connection after msw starts fails the same way. That was reproduced with two concurrent transactions.
- **Production never uses the read mode.** Neon URLs use `sslmode=require`, which starts unencrypted and then upgrades to TLS, and that path never sets `onread`.
- **Channel binding.** The new version also reads `channel_binding` from the URL itself. Channel binding is a login check tied to the server's TLS certificate. Today `src/db/connection-url.ts` strips `channel_binding` from every URL, because the old major version forwarded it to the server, which refused it with `42704`. Under the new version the strip only throws the setting away: Neon's `channel_binding=require` would be enforced if we let it through.

Decisions you made:

- Option 3: `onread: false` everywhere.
- No upstream issue.
- The repo-wide fix goes in this PR.
- Keep the existing worktrees.
- Channel binding only: credentials in Vercel and GitHub stay as they are.

**Finding that shrinks the work:** every Vitest project that touches the database (`db`, `db-mocking` and `workflow`) already redirects `import postgres from 'postgres'` to one wrapper, [tests/support/db/bounded-postgres.ts](tests/support/db/bounded-postgres.ts). The redirect is a Vite plugin in [tests/support/db-project.mts:55](tests/support/db-project.mts#L55), and it covers both `connection.ts` and each test file's own client. So the "shared helper plus guard" already exists, and it can't be bypassed in those projects: one option added to `bounded()` fixes every Vitest client. The 17 per-file edits in `/home/node/worktrees/pr-1542-b` are not needed. Playwright specs build real clients, but nothing there uses msw.

### Steps

Two agents, one after the other, in one new worktree, `/home/node/worktrees/postgres-4`. It's on a local branch from the PR head (`1742dc7b7`), with `node_modules` copied from `/home/node/worktrees/pr-1542` (which already has the new version), the copied tsc cache deleted, and `.env.local` copied in. Each agent commits each green step. The two existing worktrees are left as they are.

- **Opus agent: the tests.** It writes the tests in step 1 and the test change in step 4, runs them, and confirms they fail for the stated reason. Then it commits and stops.
- **Sonnet agent: the implementation.** It does the code in steps 2–4 and the docs in step 5, until the Opus agent's tests pass. It must not weaken those tests.

1. **Regression test first, and watch it fail (Opus).** The test starts msw and only then opens a client, and runs two concurrent transactions on it, expecting both to succeed. Without the fix it fails with `ENOTCONN`. It goes where the `db-mocking` project's list reaches, following the test-location rules.
2. **Test harness fix.** In [tests/support/db/bounded-postgres.ts](tests/support/db/bounded-postgres.ts), add `onread: false` to the options in `bounded()`. A one-line comment says why: msw's socket passthrough ignores Node's `onread` mode.
3. **App client.** In [src/db/connection.ts:22](src/db/connection.ts#L22), use `postgres(url, { onread: false })` with no environment check, so local, test and Neon all read the same way. [scripts/probe-database.ts:117](scripts/probe-database.ts#L117) gets the same option, so the probe connects the way the app does.
4. **Channel binding.** In [src/db/connection-url.ts](src/db/connection-url.ts), remove `'channel_binding'` from `CLIENT_ONLY_PARAMS`, and rewrite the comments that say postgres.js forwards it or never enforces it. The driver now reads it, enforces `require`, and defaults to `prefer`.
   - Opus updates the existing `withoutClientOnlyParams` test so that `channel_binding=require` survives the strip, before Sonnet changes the list.
   - Confirm that `drizzle-kit` resolves the same package (`npm ls postgres`). Otherwise `drizzle.config.ts` would forward the setting to the server again.
5. **Docs.** Correct every doc this makes wrong, with no version numbers in the text:
   - [claude-docs/db/README.md](claude-docs/db/README.md): the connection options.
   - `claude-docs/testing/db-harness.md`: the bounded client and why it sets `onread: false`.
   - [claude-docs/secrets.md:285-292](claude-docs/secrets.md#L285): "`channel_binding=require` can stay" becomes "is enforced".
   - [claude-docs/ci/deploy.md:203-216](claude-docs/ci/deploy.md#L203): the strip paragraph, and what the probe's `CHANNEL_BINDING_REQUIRED` error means.
   - Copy this approved plan into `claude-docs/design-decisions/postgres-driver-read-mode-and-channel-binding.md`.

### Verification

- Run, in one command:
  - the new regression test
  - the 17 msw files: the 16 that failed in CI, plus `admin-role.test.ts`
  - the `connection-url` test

  First check whether `npm test` takes the Vitest lock itself.

- Run `npm run pre-commit`: lint, format and type checks on the changed files.
- Check that the driver reads channel binding instead of forwarding it. Run `scripts/probe-database.ts` three times, each against a scratch database `sorrel_pg4`, never the shared `sorrel`:

  | URL ending                                                 | Expected result                                                             |
  | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
  | `?channel_binding=require`                                 | `CHANNEL_BINDING_REQUIRED`, because local Postgres has no TLS. Not `42704`. |
  | `?channel_binding=prefer`                                  | connects                                                                    |
  | `?channel_binding=require`, run with `drizzle-kit migrate` | `CHANNEL_BINDING_REQUIRED`, not `42704`                                     |

  Then drop `sorrel_pg4`.

- No full suites, and no local e2e run: no spec is touched, and CI runs Playwright.
- The Sonnet agent stops with local commits and reports. **Pushing is your call.** Pushing to `dependabot/npm_and_yarn/staging/postgres-4.0.0` puts the work on PR #1542, and Dependabot then stops rebasing that branch.
- After merge, on staging:
  - The migrate job's probe should report a successful connection.
  - Sign in.
  - Save and reload a record with a date.

  If Neon's staging URL carries `channel_binding=require` and the connection fails, the probe names `CHANNEL_BINDING_REQUIRED`.

## A slug's expiry is a date comparison; work that must happen on time is a durable job

**Status:** decided. The job mechanism is in `m15.46-daily-jobs-from-vercel-cron.md` and `src/lib/jobs/`.

**Decided:** a compendium entry's old slug stops answering by a date comparison at read time, with no scheduled job. Work that must happen on time (a mail, a retry, a delete) runs as a durable job.

### Why

A date predicate is exact at midnight UTC with nothing running. A mail, a retry or a delete must happen, and a Hobby cron fires within an hour of its time while Queues deliver events rather than dates. Those run as durable jobs behind one adapter in `src/lib/jobs/`, acting as the seeded System account. Work due once a day is started by a daily Vercel Cron call and runs to its end; no job sleeps for days waiting.

## Notes use real foreign keys and one generic history trigger

**Status:** decided for v2. Notes are deferred (`../backlog.md`); these two choices bind them when they are built.

**Decided:**

- **No polymorphic note subject.** A note names its subject through nullable foreign keys checked by `num_nonnulls`, which keeps real referential integrity.
- **No shadow history table per model.** History uses one generic trigger. It survives schema drift; a table per model does not.

## Bulk add is partial, with a report

**Status:** decided. Bulk add itself is deferred (`../backlog.md`); this rule binds it when it is built.

**Decided:** a bulk add is not all-or-nothing. It adds what it can and returns a report of what it skipped.

### Why

Skipping an entry that is already present is the expected case on a re-run, not a failure. The call aborts only on ids the user could not act on anyway.

## A taker ends a retired slug's redirect, once confirmed

**Decided:** a compendium entry's old slug redirects to it for 180 days, as MB.80 set, but it is no longer reserved. Another entry may take the slug, which ends the redirect; the admin is asked to confirm that first, and the page now at the address links to the entry that moved while the old window runs. A coven ingredient's slug follows its name and retires nothing. MB.80's pending claims go, with their columns. This supersedes, in part, [`mb.80-public-compendium.md`](mb.80-public-compendium.md).

### Why the reservation stopped paying

MB.80 reserved a retired slug for its whole window so that a 308 could never come to point at a different ingredient, and gave a rename whose slug was reserved a **pending claim** that took effect when the reservation lapsed. That was designed when the slug was `slugify(name + form)`, where two entries wanting one address was common — the `standard` seed's two _Cat's Claw_ barks. MB.81 then put the formal name in the slug, and that changed who can want a retired one.

A retired slug S belongs to an entry A that moved off it by changing its label, form or formal name. Another entry B wants S only if its label, form and formal name spell what A's used to:

| Case                                                                                      | Can another entry want S?                                                    |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| A relabelled, formal name and form kept                                                   | No — B would need A's formal name and form, which the identity index refuses |
| A declares no formal name and is relabelled, and a new entry takes the old label and form | Yes, by a **create**                                                         |
| A's formal name is corrected, and the entry the old name really described is added        | Yes, by a **create**                                                         |
| Another existing entry is renamed into S's text                                           | Yes, by a rename                                                             |

The common case is the first, and every design answers it the same way. Of the rest, two are creates, which the spec's pending claims did not cover: a create has no current slug to keep while it waits, and giving it a temporary one would be a second slug rule. As specified, the admin could not add the correct entry for up to 180 days. And in the correction case the taker is the rightful owner — the URL spells _Artemisia vulgaris_, and B is that plant.

Building the reservation as written would have cost a current-slug expression in every read that shows a slug, and a copy of it in JavaScript for the GraphQL field; lazy promotion of due claims, with backdated retirements; a scope-wide lock, because "is it reserved?" is check-then-write; reclaim logic; and refusals naming who holds a claim and when it lands — about twice the task's estimate, and a name and an address free to disagree for up to 180 days.

### The rule

- **The slug follows the label, the form and the formal name,** in both tiers, recomputed on every update.
- **A compendium entry's old slug is retired as the keeper's** — a `retired_ingredient_slugs` row, `retired_at` the write's own instant — and redirects to the entry's current slug until its `expires_at`, midnight UTC of the retirement's date plus 180 days, **while no live entry holds the slug.** An entry holding it is what the address answers.
- **Taking a slug another entry's redirect runs from is refused until the admin confirms it**, as a `ValidationError` on `endRedirect` naming the entry and when its window closes. Confirmed, the write takes the slug. The retirement stays, and the page now at the address names the entry that moved and links to its current address until that window closes. An entry taking back its own old slug needs no confirmation.
- **A coven ingredient's slug retires nothing.** No route reads it — coven ingredients are reached by id — so there is nothing to redirect.
- **Lapsed retirements are hard-deleted on the next compendium write,** as MB.80 had it; nothing runs on a schedule.

### What it costs

The promise MB.80 made — that a 308 never comes to point at a different ingredient inside its window — is given up. A reader who bookmarked A's page for A itself lands on B, whose name is exactly what the URL spells, and the page then links them to A. A search engine sees S go from a 308 to a 200 about a different entry; the ranking A's page had moved to A's new address with the 308, and S's new content starts without history.

The confirmation is read before the write rather than inside it, so two keepers saving at the same instant can both pass it. With only keepers writing the compendium, that is accepted rather than locked.

### The pending columns

`pending_slug`, `pending_slug_effective_at` and their two partial unique indexes leave the Drizzle schema here and are dropped by **MB.107**, once this has deployed: a column drop is two PRs (CLAUDE.md rule 10), because `migrate.yml` runs before a deploy promotes, and a deploy still declaring a dropped column fails its reads.

### Split out

A "new at this address" notice was considered and widened into a marker every entry carries: **MB.106** marks compendium entries New or Updated for 30 days, whatever their address.

### Tasks

| Task   | What                                                                                       |
| ------ | ------------------------------------------------------------------------------------------ |
| MB.82  | This rule, the confirmation, the address resolution the public route reads, and the docs   |
| MB.107 | Drop the pending-slug columns and indexes, after MB.82 has deployed                        |
| MB.106 | New and Updated markers on compendium entries, in Wave 12                                  |
| M5.5   | The admin form asks for the confirmation and sends the write again with `endRedirect`      |
| M8.19  | The entry page links to the entry that moved off its address; a retired slug answers a 308 |

## Domain modules with a guarded boundary

**Decided (2026-09-27):** `src/` is a modular monolith. Five domain modules under `src/modules/`, each owning its tables and its services, with a public surface and an allowed dependency graph enforced by lint and by a guard test. The `ingredients` table stays one table with two tiers, and the reads that cross the tiers are a named, countable set in the repository. Modules are directories under one package, not npm workspace packages. The working summary is [`../modules.md`](../modules.md).

### What the question was

What would make a later move to separately deployed services a transport change rather than a rewrite. The rules already gave most of a modular monolith: a service takes a session value rather than a request, `src/db/repository/` is the only query author, audit columns reference users by id, and there are no server actions. What blocked a split was the layout, not the rules. `src/db/schema`, `src/services`, `src/graphql/schema` and `src/graphql/loaders` each mixed every domain, so no unit could be lifted out, and nothing said which code owned which table. At six services and one GraphQL field the move costs an afternoon; after Wave 8 adds the real services it costs a wave.

### The five modules

| Module        | Owns                                                                                                                              | May import                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `identity`    | `users`, `sessions`, `accounts`, `verifications`; later `admin_invitations`                                                       | nothing                                          |
| `coven`       | `workspaces`, `workspace_members`, `workspace_invitations`                                                                        | `identity`                                       |
| `vocabulary`  | `category_groups`, `categories`, `ingredient_form_groups`, `ingredient_forms`                                                     | `identity`                                       |
| `ingredients` | `ingredients` (both tiers), `ingredient_folk_names`, `ingredient_categories`, `inventory_items`; later `retired_ingredient_slugs` | `identity`, `coven`, `vocabulary`                |
| `grimoire`    | `spells`, `spell_ingredients`, `spell_categories`                                                                                 | `identity`, `coven`, `vocabulary`, `ingredients` |

**Why these five.** The cut follows two things that already existed. The first is the foreign-key graph: every table has exactly one owner, and an edge in the table above is exactly a foreign key or a service call that already crosses in that direction — `spell_ingredients` references `ingredients`, `ingredients` references `workspaces` and `categories`, everything references `users` through the audit stamps. Drawn that way the graph is acyclic without any table being moved, which is the test of a cut being real rather than imposed. The second is the project's vocabulary: CLAUDE.md's three nouns — Compendium, Ingredients, Grimoire — are what a user sees, and `identity` and `coven` are the two things a user is a member of. A module named from a noun the codebase already uses consistently is one nobody has to learn.

**Why the compendium is a tier, not a module.** The compendium and a workspace's ingredients share one table, one identity model (formal name plus form), one search component and one detail page, and the local-beats-compendium resolution reads both in one statement. A `compendium` module would own no table of its own and would import everything `ingredients` owns; the boundary between them would be a line on a diagram that no import could respect. So the compendium is an access path inside `ingredients` — the `workspace_id IS NULL` tier — and the future extraction unit for a reference-data service is that tier plus `vocabulary`. What makes that extraction countable rather than notional is the seam pinned below.

**Why the public surface is the index plus the schema files.** A module's `index.ts` is its behaviour surface: the services, the types, the GraphQL refs and the loader factories it means to offer. Its `schema/*.ts` files are public as well, and for a reason rather than for convenience: the seed, the repository, drizzle-kit and a cross-module foreign key all need a table object without loading a service, and every service carries `import 'server-only'`, which the seed's `tsx` runtime cannot resolve. A table object is inert without the database client or a runtime `drizzle-orm`, both already banned above the database layer, so letting a page import one leaks nothing. `services/`, `graphql/` and `loaders/` are internal. This replaced the plan's list of pinned infrastructure exceptions: what looked like exceptions were schema imports, and the two type imports (`Membership`, `WorkspaceRole`) come from `@/modules/coven`'s index.

### What it rules out

#### Splitting `ingredients` into two tables

The obvious shape for a "compendium module" is a `compendium_entries` table beside a workspace-scoped `ingredients` table. It was considered at length and rejected, because the costs are large, immediate and structural, and what it buys is small:

- **Every referrer doubles its foreign keys.** `spell_ingredients`, `inventory_items`, `ingredient_folk_names`, `ingredient_categories`, MB.81's `retired_ingredient_slugs`, and v2's notes each gain a second nullable reference and a check that exactly one is set. MB.40's `num_nonnulls` constraint on `spell_ingredients`, today a two-way choice between an ingredient reference and a custom name, becomes three-way.
- **The identity machinery forks.** `canonical_key`, its three checks, the trigram index, the nomenclature biconditional, the `updated_at` trigger line and the nine tests that pin them all exist twice, and the partial unique indexes that reserve an identity have to be reasoned about across two tables.
- **The merged list becomes a union.** The two-tier list a workspace sees — its own entries over the compendium's — is one query with one sort key today. Over two tables it is a paged union, which the M3.6 keyset helper does not page: a cursor encodes one sort key and one id from one table.
- **One id space becomes two.** `/ingredients/[id]`, the GraphQL `Ingredient` type and every loader keyed by ingredient id would need a discriminator, or two routes, two types and two loaders.
- **It reverses a recorded decision and cuts across scheduled work.** DESIGN.md §5's "one table, two tiers" is argued there; MB.81 and MB.82 (the slug), M5.5 (the admin form) and M8.19 (the detail page) are all specified against one table.
- **It is destructive DDL and its own table task**, under the table-then-behaviour rule, and a contract migration on a table the seeds already fill.

What the split buys is one thing: at extraction time, the reference-data service would not have to carry a `WHERE workspace_id IS NULL` on its reads. That is a filter a finder already applies by shape, the way soft-delete filtering is applied. The real extraction cost is the cross-tier reads — the merged list, the local-beats-compendium resolution, the suggestions that draw from both — and those are identical under both designs, because they are joins between the tiers whichever tables the tiers sit in. So the design keeps one table and makes the cross-tier reads a countable set: `TIER_SEAM` in `tests/guards/module-boundaries.test.ts` must name every exported repository finder whose SQL reads the compendium tier. It is empty today; M4.5, M5.1 and Wave 12's tasks add to it, each in its own PR.

#### npm workspace packages

A `packages/*` layout with one `package.json` per module gives a physical boundary that the module resolver enforces. It was deferred, not rejected: it would touch every guard, every glob, the `@/` alias, the coverage include, the Vitest projects and the Docker image, for a boundary that `no-restricted-imports` plus a guard test already draws with the same precision. The day a module is actually being extracted, turning its directory into a package is the first step of that task, and nothing done here has to be undone for it.

### What the move surfaced

drizzle-kit loads its schema glob one file at a time, so with the tables in five directories any schema file could be the first module evaluated — and the first one, alphabetically, reached `src/db/audit.ts` before `users`. That is the `users` ↔ `audit.ts` cycle the seed's import-order rule existed to dodge (../db/README.md, "The seed module", and MB.60, where the repository entering from the wrong end built `users` with no stamps and every write to it went out unstamped, silently). One directory had hidden it: `auth.ts` sorted first and happened to import `users` before anything else. Ordering every schema file by hand would have been the boilerplate every new table copies. Instead the cycle is removed: `audit.ts` exports factories that take a thunk to `users.id` and imports nothing from a module, and the column instances are built beside `users` in the identity module and imported from there. The ordering rule, its comments and its two doc paragraphs are gone with it.

### What a future extraction replaces

Three things are in-process today and would become calls across a boundary. Each is named so the extraction task can find it rather than discover it:

- **The `TIER_SEAM` finders.** Every repository export named in the allowlist reads the compendium tier, and each becomes either a call to the reference-data service or a local copy of published reference data. The list is the scope of that task.
- **The cross-module joins.** A spell's derived categories are the union of its ingredients' categories: a join from `spell_ingredients` through `ingredients` to `ingredient_categories`, which is `grimoire` reading `ingredients`' tables in one statement under the `Membership` proof. Across services that becomes a batched request to `ingredients` for the categories of a list of ingredient ids — a loader, by rule 9 — and the same shape holds for any finder that reaches another module's table.
- **The `Membership` proof.** `assertMembership` returns a branded `{ workspaceId, userId, role }` that only the membership service can construct, and every workspace-scoped finder demands it. The brand is a compile-time fact, which is exactly what a network boundary erases: a callee cannot trust a type it did not check. The equivalent across services is a short-lived signed token minted by `coven` carrying the same three fields, verified by the callee before it scopes its query. Same guarantee, exchanged at runtime instead of erased at compile time.

### Not in this task

Recorded here so they are follow-ups rather than omissions:

- **The spell finders stay in the repository.** `findManySpells`, `findOneSpell` and `findManyInSpell` belong in `grimoire`, but `tests/guards/soft-delete-finder-guard.test.ts` pins the repository's export list and moving them is a behaviour task of its own.
- **No central `env` module.** `src/lib/auth.ts` still throws at import on a missing variable; a validated `env.ts` that every module reads is a separate task.
- **Seeds stay in `src/db/seed/`.** The seed is the one legitimately cross-domain composer; per-module seeds composed by it are a later shape, if scenarios grow enough to want it.
- **No GraphQL federation.** One builder, one schema, one endpoint; a module registers on the shared builder. Federation is the transport a real extraction would choose, and choosing it earlier buys nothing.

## Types live in type-only files

**Decided:** every `type` and `interface` in `src/` and `scripts/` moves out of the code file that used it into a type-only file, by default a `types.ts` beside that code, except three kinds that stay put. A guard fails any new one written inline. MB.109 carries the rule to `tests/`. The summary is [`modules.md`](../modules.md), "Where types live".

### Why

The owner's call: types cluttered the files whose job is behaviour. Before this, 126 declarations in 61 files of `src/` and `scripts/` sat beside the code that used them, and `src/lib/session.ts` was the one type-only file. Collecting them also turned up copies: `IngredientRow` was declared three times and `SeedUser` twice identically, and each is declared once now.

### Where a type goes

**A `types.ts` per directory**, beside the code that uses the type. Two alternatives lost:

- **A central `src/types/`** would put a type away from its users. It would also be a sixth place outside the five modules that every module imports, which the boundary guard has no line for.
- **A sidecar per file**, such as `select.types.ts`, would double the file count. Each sidecar under `services/` would also need `import 'server-only'`, because `server-only-services.test.ts` reads every file there.

**A types file inherits the import reach of everything that imports it**, because the guards that walk imports follow `import type` too. Three placements follow from that:

- **`src/lib/types.ts` imports nothing.** `client-safe-validation.test.ts` walks from `src/lib/validation.ts` through `errors.ts` into it, and fails on any package but zod. That is what keeps the session types, which need `users` and Better Auth, in `src/lib/session.ts`, with Better Auth's hook context.
- **A validation file's helper types go to `validation/types.ts`.** The module's own `types.ts` reaches its tables and so `drizzle-orm`.
- **A module's `types.ts` sits at the module root**, internal, with the index naming its public types (the summary has the shape), so the module's surface stayed exactly what it was. At the root rather than under `services/` it needs no `server-only`. It is not made a fourth public surface beside the index, `schema/` and `validation/`: the index already offers every public type, and a fourth entry point would widen the boundary for nothing. The lint's deep-import group gains `@/modules/*/types`.

**The repository's `shapes.ts` split in two.** Its types, with the ones the finders and the writer declared, are `types.ts`, and its three predicates `predicates.ts`; what the index re-exports is the summary's.

**Scripts import their types with `import type` and the `.ts` extension**, both of which Node's own type stripping needs.

### What stays, and why

- **A type derived from a value declared in the same file.** Examples are the Zod schema and type pairs, `(typeof UNIT_DIMENSIONS)[number]`, `Loaders` from the private `LOADERS`, and `WorkspacePermission` from the private `statements`. A types file would have to import the value back, and the Zod pairs would lose the one name that carries both schema and type. Exporting a private value to move its type would widen a surface to tidy a file.
- **The branded proofs, `Membership` and `SiteAdmin`.** The brand's `unique symbol` is unexported so that no other file can name it. CLAUDE.md rule 5 and `../db/README.md` describe it as living beside the one function that mints the proof. Moving the symbol with the type would still compile, but it would turn a one-file mechanism into a two-file one.
- **`Executor` and `Transaction`**, the repository's two `typeof db` types. Only the pinned set of files may import the client, even type-only, and a types file would be one more exemption.

A type declared inside a function, a `describe` block or a `declare global` block belongs to that code. So the `PothosSchemaTypes` augmentation stays beside the prototype patch it types.

### The guard

What `tests/guards/types-in-type-files.test.ts` checks is the summary's. Two choices in it are this record's: the pinned list of the third kind carries a staleness check, and a precondition asserts that the scan found and exempted both proofs and a Zod pair, so an empty scan cannot pass.

It reads text rather than a syntax tree. Prettier, which pre-commit and CI both run, puts every top-level statement at column 0 and indents everything nested. That makes column 0 a reliable statement boundary without a parser. A declaration's extent runs to its closing `;` or `}` by bracket depth, skipping strings and comments, which is what lets it see a brand key four lines below the head.

### What it costs

More files: about twenty-five `types.ts` in `src/` and `scripts/`, and one more import line in most code files. The exemptions are read by pattern rather than by a type checker, so an unusual declaration shape could be misread. The guard's fixture test pins the two shapes known to be awkward: a generic default of `{}` ahead of an interface body, and a union spread over lines.
