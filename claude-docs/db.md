# Database — summary

`src/db/connection.ts` is the only place the Postgres driver is instantiated.
It exports `db`, a Drizzle client, built with `drizzle-orm/postgres-js` over
the `postgres` package (pure JS, no native binary). `db` reads `DATABASE_URL`
from the environment at module load and throws if it is unset — no default,
no silent fallback. The client is one per process per URL, held on
`globalThis` so a module evaluated twice in one process — `vi.resetModules()`
in a test, a hot reload under `next dev` — reuses the pool rather than
opening another that nothing ends (MB.179;
[`testing/db-harness.md`](testing/db-harness.md#connections-per-run-mb179)).

- **One driver call site.** Nothing outside `connection.ts` calls `postgres(...)`.
  `src/db/repository/` (M1.16) is the only _application_ code that imports
  `db` from here — everything else reaches the database through the
  repository. Three pieces of infrastructure are exempt; see "Who may import
  the client" below.
- **Local Postgres and Neon use the same code path.** `postgres` (the driver)
  parses `sslmode` off the connection string itself, so a Neon URL's
  `?sslmode=require` turns on TLS automatically and a local URL with no
  `sslmode` stays plaintext — `connection.ts` never branches on environment.
- **`drizzle.config.ts`** (repo root) drives `drizzle-kit`: `dialect:
'postgresql'`, schema at the glob `./src/modules/*/schema/*.ts` — every module's tables, no barrel and no registration step — and migrations output to
  `src/db/migrations`. It reads the same `DATABASE_URL` and throws under the
  same condition.

**Every section is a file under `db/`**, moved there whole, as is each
subsection large enough to read alone. This page keeps each `## ` and `### `
heading with a link to where it lives; a citation in code names that file, not
this page.

## Why the ORM stays on 0.45.2 (MB.20)

`drizzle-orm` stays pinned at `0.45.2` and `drizzle-kit` at `0.31.10`, deliberately not upgraded: the standing `npm audit` advisory has no runtime exposure, and three named triggers would reopen the decision. [`db/orm-version.md`](db/orm-version.md)

## Debugging a query (MB.22)

`make db-psql` opens a prompt against the compose database, and `DEBUG_SQL=1` prints every statement the repository emits. [`db/debugging-a-query.md`](db/debugging-a-query.md)

## Migrations and scripts (M1.3)

The `db:*` scripts (generate, migrate, seed, drop, reset, studio), `probe-database.ts` for a migration that fails silently, the `sorrel` role and `sorrel_template`, and each migration written or edited by hand, with the reason. [`db/migrations-and-scripts.md`](db/migrations-and-scripts.md)

## Workspaces and membership (M6.2)

`workspaces` with no `kind` column, `workspace_members` keyed on the workspace and user pair, and the `workspace_role` enum, whose declaration order is not a hierarchy. [`db/workspaces-and-membership.md`](db/workspaces-and-membership.md)

## Invitations (M7.1)

`workspace_invitations`: the invited address, the role, the hashed token, four lifecycle columns rather than a `status` enum, and the constraint that keeps `owner` out of it. [`db/invitations.md`](db/invitations.md)

## The ingredient identity model (MB.28, table M4.1)

`ingredients` (both tiers in one table), `ingredient_forms`, `ingredient_folk_names` and `ingredient_substitutes`, each substitute a link or a typed name (MB.138, table MB.139), and `ingredient_deities`, each deity a name with the curated row picked beside it, in the order entered (MB.165): identity is formal name plus form in the generated `canonical_key`, unique per tier by partial index, and `form_id` records a picked form beside the text, outside the key; planets, zodiac signs and colours are `text[]` lists stored as `deities` is, in the order entered (MB.134, MB.136); elements an `ingredient_element[]` list in the order chosen, a repeat refused (MB.157, built by MB.158 and MB.159). [`db/identity-model.md`](db/identity-model.md)

### Fuzzy matching: one index, and a rule every caller is bound by (M4.6)

[`db/fuzzy-matching.md`](db/fuzzy-matching.md)

### Ingredient slugs (MB.80; table MB.81, rule MB.82)

[`db/ingredient-slugs.md`](db/ingredient-slugs.md)

## Categories, and the two group vocabularies (MB.35; tables M4.2, M4.2a)

`categories`, `category_groups`, `ingredient_forms` and `ingredient_form_groups`: groups are admin-curated rows rather than enums, a category group carries a colour for each theme, and a vocabulary only admins write is a foreign key; then the admin's writes to each, a deleted group's rows moving to a group the admin picks. [`db/categories.md`](db/categories.md)

## The astrology vocabularies (MB.91; tables MB.92)

`planets` and `zodiac_signs`, the admin-curated vocabularies behind the lists `ingredients.planets` and `.zodiac_signs` (MB.136), whose entries stay free text as `form` does, and the member's autofill, whose finders suggest planets, signs, forms and common names. [`db/astrology-vocabularies.md`](db/astrology-vocabularies.md)

## The deity vocabulary (MB.127; tables MB.128)

`deities`, the admin-curated vocabulary behind an ingredient's deities, the rows of `ingredient_deities` since MB.167, whose names stay free text with the curated row picked beside them as `form` does, grouped by `deity_traditions` as the forms are by their groups, with a required description that carries each deity's other spellings. [`db/deity-vocabulary.md`](db/deity-vocabulary.md)

### The member's autofill (MB.94)

[`db/member-autofill.md`](db/member-autofill.md)

## References (MB.151; tables MB.152)

`references`, one Chicago-form source per row, two-tiered as `ingredients` is, and `reference_links`, one soft-deleted row per sourced ingredient, deity, tradition, planet or sign under `num_nonnulls`, both owned by `ingredients`: the kind decides the rendering and the CHECKs make it total, a link carries a locator and nothing else, nothing deletes a reference in v1, and `src/lib/citation.ts` renders the citation rather than any column storing it. [`db/references.md`](db/references.md)

## Stock, and the one module that owns the units (M9.2)

`inventory_items`, the unit vocabulary one module owns, the dimension stored beside each unit, and why an unset quantity is not zero. [`db/stock.md`](db/stock.md)

### One module owns the units

In [`db/stock.md`](db/stock.md#one-module-owns-the-units).

### The dimension stored beside the unit

In [`db/stock.md`](db/stock.md#the-dimension-stored-beside-the-unit).

### Nullability, and why zero is not the same as nothing

In [`db/stock.md`](db/stock.md#nullability-and-why-zero-is-not-the-same-as-nothing).

## The grimoire (M10.2)

`spells` and `spell_ingredients`: a layer names an ingredient rather than a stock row or may name a custom one instead (MB.40), is soft-deleted, and its order is unique among the spell's live layers. [`db/grimoire.md`](db/grimoire.md)

### The join names the ingredient, never the stock row

In [`db/grimoire.md`](db/grimoire.md#the-join-names-the-ingredient-never-the-stock-row).

### Layer order is the identity, and what that costs the reorder

In [`db/grimoire.md`](db/grimoire.md#layer-order-is-the-identity-and-what-that-costs-the-reorder).

### Custom ingredients (MB.40)

In [`db/grimoire.md`](db/grimoire.md#custom-ingredients-mb40).

### The rest of the calls, and the ones not made

In [`db/grimoire.md`](db/grimoire.md#the-rest-of-the-calls-and-the-ones-not-made).

## Expand/contract and the destructive-DDL check (M1.5)

Migrations are forward-only and expand/contract, a drop is two PRs, and the destructive-DDL check refuses a migration carrying a `DROP`, `RENAME`, type change or `NOT NULL` addition without its `.ack.md` sidecar. [`db/expand-contract.md`](db/expand-contract.md)

## Audit columns and `applyAudit` (M1.15, FKs restored MB.5, split MB.34)

The audit column sets every table spreads (`auditColumns`, or `auditStampColumns` on the two hard-deleted join tables), and `applyAudit`, which stamps a write's payload from the session, never the caller. [`db/audit-columns.md`](db/audit-columns.md)

## `updated_at` is the database's (M1.18)

The `set_updated_at()` trigger stamps `updated_at` on every audited table, overriding whatever the statement supplied, and a table added after `0016` attaches it in its own migration, which a catalogue test enforces. [`db/updated-at.md`](db/updated-at.md)

### A table added later does not get the trigger for free

In [`db/updated-at.md`](db/updated-at.md#a-table-added-later-does-not-get-the-trigger-for-free).

## The repository's files (MB.87)

`src/db/repository/` file by file: callers import its `index.ts`, and a lint group and a guard keep the rest of the folder internal. [`db/repository-files.md`](db/repository-files.md)

## The write path — `withAudit` (M1.16)

`withAudit(session, fn)` is the one exported write path: `fn` gets a narrow `AuditWriter`, and `app.current_user_id` is published for each transaction. [`db/write-path.md`](db/write-path.md)

### Table marks

In [`db/write-path.md`](db/write-path.md#table-marks-mb198).

### `app.current_user_id`, published per transaction (M1.19)

In [`db/write-path.md`](db/write-path.md#appcurrent_user_id-published-per-transaction-m119).

## The Membership proof (M6.3)

`assertMembership` returns the branded `Membership` every workspace-scoped finder and writer takes first: what the check asks, the finder convention, the four reads that take no proof, and where it is weaker than a policy. [`db/membership-proof.md`](db/membership-proof.md)

### What the check asks

In [`db/membership-proof.md`](db/membership-proof.md#what-the-check-asks).

### One lookup per render

In [`db/membership-proof.md`](db/membership-proof.md#one-lookup-per-render).

### The finder convention

[`db/finder-convention.md`](db/finder-convention.md)

### The four reads that take no proof

In [`db/membership-proof.md`](db/membership-proof.md#the-four-reads-that-take-no-proof).

### Where the proof is weaker than a policy

In [`db/membership-proof.md`](db/membership-proof.md#where-the-proof-is-weaker-than-a-policy).

## The SiteAdmin proof (M5.2)

`assertSiteAdmin` returns the branded `SiteAdmin` proof the writer's three compendium-tier methods demand; the one-tier vocabulary tables are written without it, their services checking the site role themselves. [`db/site-admin-proof.md`](db/site-admin-proof.md)

## Spell visibility (M10.3)

A private spell is its author's alone and a workspace spell its coven's: the finders that decide it in SQL, what a spell holds, the one-way widening rule, and the by-id `AuditWriter` methods such as `updateByIdInWorkspace`. [`db/spell-visibility.md`](db/spell-visibility.md)

### Reading: three finders, and why the generic ones refuse

In [`db/spell-visibility.md`](db/spell-visibility.md#reading-three-finders-and-why-the-generic-ones-refuse).

### What a spell holds (M5.3)

In [`db/spell-visibility.md`](db/spell-visibility.md#what-a-spell-holds-m53).

### Writing: the one-way rule

In [`db/spell-visibility.md`](db/spell-visibility.md#writing-the-one-way-rule).

### `updateByIdInWorkspace`, and why it exists

In [`db/spell-visibility.md`](db/spell-visibility.md#updatebyidinworkspace-and-why-it-exists).

## Ingredient children (M4.8)

`ingredient_folk_names` and `ingredient_categories` take their parent ingredient's tier: `IngredientScoped` keeps them off the unscoped finders, and `findManyOfIngredients` reads them under a list of proofs, deciding the tier in SQL. [`db/ingredient-children.md`](db/ingredient-children.md)

## Workspace ingredients (M8.2)

The four services that create, update, delete and read a coven's own ingredients, and why nothing there can promote a row to the compendium. [`db/workspace-ingredients.md`](db/workspace-ingredients.md)

## The compendium read (M8.5)

The compendium's reads take no session: one keyset page under an optional filter with its accent-folded word-similarity search, the count that numbers those pages, one entry by id, and the curated form values. [`db/compendium-read.md`](db/compendium-read.md)

## Compendium writes (M5.2)

The three services that create, update and delete a compendium entry, each behind `assertSiteAdmin` before its input is parsed, and the collision error naming the entry that holds the identity, read by `findCompendiumEntryByIdentity`. [`db/compendium-writes.md`](db/compendium-writes.md)

## Soft-delete filtering and the partial-index convention (M1.20)

`findMany`, `findOne` and every other exported finder filter `deleted_at` through `selectFrom` or `existsIn`, bar four `…IncludingSoftDeleted` hatches a guard test pins; every unique index is partial, so a deleted row reserves nothing. [`db/soft-delete.md`](db/soft-delete.md)

## Keyset pages (M3.6)

`findPage` and `findPageInWorkspace`: sort parts, cursors, the id tie-break, a joined relation and carried values, and the count behind a connection's `totalCount` and `countBefore` (MB.105). [`db/keyset-pages.md`](db/keyset-pages.md)

## Hard delete on two join tables (MB.34)

Why `ingredient_categories` and `spell_categories` delete a removed link outright, with four stamp columns and no `deleted_at`, while `spell_ingredients` is soft-deleted, and the `write.delete` and `write.softDelete` types that keep the shapes apart. [`db/hard-delete-join-tables.md`](db/hard-delete-join-tables.md)

## `ingredient_categories` (M4.4)

Story 22's join of an ingredient to its categories: keyed on the pair, indexed both ways, hard-deleted, and read by the `categoriesByIngredient` loader. [`db/ingredient-categories.md`](db/ingredient-categories.md)

## `spell_categories` (M10.4)

Story 48's join of a spell to its assigned categories; the derived ones are read through its ingredients and stored nowhere. [`db/spell-categories.md`](db/spell-categories.md)

## The seed module (M1.21)

`seed(db, { scenario })` is the one seed for Docker, Vitest and Playwright and writes through the handle it is given rather than `withAudit`; its shared helpers and the `minimal` scenario are here too. [`db/seed-module.md`](db/seed-module.md)

## The category seed (M4.3)

§6's eight `category_groups` and 63 `categories`, seeded as reference data rather than a scenario: idempotent by seed key (MB.172), with each group's colour pair written from the owner's hand-tuned hexes in `src/db/seed/category-groups.ts`, and run by `migrate.yml` after it migrates. [`db/category-seed.md`](db/category-seed.md)

## The form vocabulary seed (M4.3a)

§5's six `ingredient_form_groups` and 78 `ingredient_forms`, seeded the category seed's way, and the rules the list keeps: grouped by what is held, no `Other`, one row per kind of thing. [`db/form-vocabulary-seed.md`](db/form-vocabulary-seed.md)

## The astrology vocabulary seed (MB.93)

§5's nineteen `planets` and thirteen `zodiac_signs`, seeded the form seed's way through `seedFlatVocabulary`, with descriptions written as searchable glosses and the sources the lists came from. [`db/astrology-vocabulary-seed.md`](db/astrology-vocabulary-seed.md)

## The deity vocabulary seed (list MB.127; seed MB.129)

Thirty-five traditions and 216 deities, the owner's starting list, with their descriptions, what was left out and why, and the sources the list came from; MB.129 seeds and parses it. [`db/deity-vocabulary-seed.md`](db/deity-vocabulary-seed.md)

## The standard scenario (M1.22)

Fixture users A to E, workspaces W and X and a compendium awkward on purpose: the fixed cast every authorization test reads against. [`db/standard-scenario.md`](db/standard-scenario.md)

### The compendium is awkward on purpose

In [`db/standard-scenario.md`](db/standard-scenario.md#the-compendium-is-awkward-on-purpose).

### One transaction, every vocabulary

In [`db/standard-scenario.md`](db/standard-scenario.md#one-transaction-every-vocabulary).

## The demo scenario (M1.23)

`standard` plus two spells written the way a member would write them, for screenshots, each jar's stack seeded whole or not at all. [`db/demo-scenario.md`](db/demo-scenario.md)

### A jar's stack is seeded whole or not at all

In [`db/demo-scenario.md`](db/demo-scenario.md#a-jars-stack-is-seeded-whole-or-not-at-all).

## The provisional-account delete (MB.67)

`deleteProvisionalUsers` is the one hard delete of a table carrying `deleted_at`: it removes unverified accounts past their lifetime or cap, outside `withAudit`, since there is no session. [`db/provisional-account-delete.md`](db/provisional-account-delete.md)

## Who may import the client (M1.17)

The `no-restricted-imports` rule that keeps `connection.ts` to the repository, and the exemptions written on the imports themselves, pinned by `lint-db-client-boundary.test.ts`. [`db/client-imports.md`](db/client-imports.md)

## Where queries may be built (MB.33)

The lint group that bans a runtime `drizzle-orm` import outside the database layer, and what a `sql` fragment is for. [`db/query-building.md`](db/query-building.md)

### What a `sql` fragment is for (MB.100)

[`db/sql-fragments.md`](db/sql-fragments.md)

## Snapshot before production migrations, and the restore runbook (M1.6)

The `snapshot-<short sha>` Neon branch `migrate.yml` takes before a production migration, skipped until its secrets are set, the prune that keeps three, and the runbook that promotes one. [`db/snapshot-and-restore.md`](db/snapshot-and-restore.md)
