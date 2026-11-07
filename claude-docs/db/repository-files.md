## The repository's files (MB.87)

`src/db/repository/` is one file per concern, and callers import only its
`index.ts` — `@/db/repository` resolves to it:

| File                   | Holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`             | Named re-exports only — the pinned surface below — and nothing declared                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `types.ts`             | The table shapes a finder or writer admits, the options `selectFrom` reads, the `AuditWriter`, and what a finder takes and returns; the index re-exports the last two                                                                                                                                                                                                                                                                                                                           |
| `predicates.ts`        | The `scopedTo`, `inCompendium` and `notSoftDeleted` predicates, each decided by the table's shape; `inTiers` and `readableInTiers`, the two tiers read together (MB.206); and the text matches: `containsText`, the admin lists' literal substring, and `fold`, `trigramMatch` and `foldedWordMatch`                                                                                                                                                                                            |
| `ingredient-parent.ts` | `readableIngredientParent`, a child row's parent ingredient read in its tier (MB.206), `inUseIngredientParent`, the same read that also admits a retired compendium entry the reading coven's cupboard names (M12.24), and `inUseVariantParent`, a variant's row read through the variant to the ingredient `inUseIngredientParent` admits. All three build on `select.ts`'s `existsIn`, so they sit apart from `predicates.ts`, which `select.ts` imports, and the two import one way (MB.231) |
| `write.ts`             | `withAudit` and the writer it builds, spreading in the named writes of each table marked `namedWrites` from the file beside its finders (MB.198)                                                                                                                                                                                                                                                                                                                                                |
| `select.ts`            | `selectFrom` and `existsIn`, the two places a read query is built, and `existsInIncludingSoftDeleted`, `existsIn` without the parent's tombstone filter, for `inUseIngredientParent` alone (M12.24); and `selectOne`, a one-row read through the first; the keyset bounds a page is cut by; the similarity thresholds, and `readUnder`, the transaction a read sets them in                                                                                                                     |
| `unit-of-work.ts`      | `currentWriteTransaction` and `runInWriteTransaction`, the getter and the runner of the store `withAudit` publishes its transaction in, so `selectFrom` reads on it (MB.148)                                                                                                                                                                                                                                                                                                                    |
| `ingredients.ts`       | The ingredient finders: the fuzzy-duplicate match, the compendium list and its count, one entry, an entry by identity, an ingredient's children, a variant's own rows (`findManyOfVariants`, MB.218), one live variant by id in a readable tier (`findReadableVariant`, M9.3), and the hatch reading an ingredient's or a variant's substitutes with the ingredients they link, deleted or not                                                                                                  |
| `slugs.ts`             | The compendium entry at a slug, and the redirect from a retired one                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `vocabularies.ts`      | `findVocabularySuggestions`, the celestial body, zodiac, form and deity autofill; each curated vocabulary's admin page and count, through `findPage`; `findCuratedRowsByName`, the rows the compendium is held to (MB.162); and `curated`, a row live under a live group                                                                                                                                                                                                                        |
| `common-names.ts`      | `findCommonNameSuggestions`, the common-name autofill                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `suggestion-page.ts`   | The keyset page and claimant list the two autofills share                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `finders.ts`           | The generic finders, scoped and unscoped — `findOneBySlug` among them (M5.6) — the escape hatch, and the page-and-count pair every list is cut and counted by, `findPageInTiers` and its count among them (MB.206), and `findPageInScope` and its count, for a finder spelling its own scope (MB.115), with `findPageInScopeIncludingSoftDeleted` and its count, the same without the tombstone filter, for the coven Ingredients list alone (M12.32)                                           |
| `spells.ts`            | The three spell finders, the `readableSpells` predicate they share, the two hatches that read what a spell holds past a tombstone, and the layer writes Make It Ours moves layers with (M12.23)                                                                                                                                                                                                                                                                                                 |
| `stock.ts`             | A coven's stock rows by id and by ingredient, each read through a live form of a live ingredient, so a deleted ingredient's jar is in no read (M9.3)                                                                                                                                                                                                                                                                                                                                            |
| `memberships.ts`       | Two of the reads that take no proof                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `users.ts`             | The third of them: the live row holding an address; and the admin user list's page, count (MB.115) and providers, under the `SiteAdmin` proof (MB.52)                                                                                                                                                                                                                                                                                                                                           |
| `workspaces.ts`        | `findDemoWorkspace`, the live demo coven, a read that takes no proof                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `provisional-users.ts` | The provisional-account delete                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `invitations.ts`       | Both tiers' invitation finders, the token read and the received reads among those that take no proof (MB.69; by tier since MB.202; M10.32), and the named insert, accept and revoke, which `writerFor` spreads into the writer (MB.198)                                                                                                                                                                                                                                                         |
| `tokens.ts`            | `hashToken`, the one place a link's token is hashed, so no caller holds a hash (MB.69)                                                                                                                                                                                                                                                                                                                                                                                                          |
| `admin-roles.ts`       | The open admin-role-change pause, under the `SiteAdmin` proof (MB.62), the pause ledger's named pause and resume, and the live keepers locked for a revoke (MB.59), which `writerFor` spreads into the writer (MB.198)                                                                                                                                                                                                                                                                          |

**MB.215: `ingredient-parent.ts` gains `readableVariantParent`.** MB.218 adds `readableVariantParent(memberships, variantColumn)` beside `readableIngredientParent`: a variant's child row read in its tier, through the variant to its ingredient. It sits in `ingredient-parent.ts` for the same reason, building on `select.ts`'s `existsIn`, and keeps the one-way imports MB.231's lint rule holds. The `ingredient-parent.ts` row above gained it, and the `ingredients.ts` row the finder built on it, `findManyOfVariants`, in MB.218's PR. M12.24's `inUseVariantParent` later took every caller, and the helper was removed.

**The rest of the folder is internal, and that is enforced rather than
conventional.** `selectFrom` and `existsIn` are exported from `select.ts`
because the finders beside them build on them, so the language no longer keeps
them private as it did when the repository was one file. What keeps them inside the folder is a
`no-restricted-imports` group banning `@/db/repository/*` and
`**/db/repository/*` everywhere (restated in each override, which replaces
rather than merges), and the `sorrel/module-boundaries` lint rule
(`lint/sorrel-lint.js`), which resolves every relative import in `src/` and
fails any edge into the folder that is not its index — the spellings a glob
cannot see. The index itself declares nothing and has no `export *`, so what
it names _is_ the surface `soft-delete-finder-guard.test.ts` reads its
finders from. Import order is not
load-bearing (["The seed module"](seed-module.md)).

### Why the ORM stays on the 0.45 line (MB.20)

`drizzle-orm` follows the `0.45` line and `drizzle-kit` the `0.31` line — the
stable dist-tags of both — and neither moves to a `1.0` release candidate. The
ranges in `package.json` (`^0.45`, `^0.31`) are not exact pins, and Dependabot
moves the patch. The facts, as of 2026-09-17:

- `drizzle-orm@0.45.2` last published **2026-03-27**. There is no GA `1.0.0`;
  the `rc` tag points at `1.0.0-rc.4`, with `rc.5-<hash>` CI snapshots after it.
  The stable line is effectively frozen.
- `npm audit` therefore carries a standing moderate advisory
  (GHSA-67mh-4wv8-2f99) reached only through
  `drizzle-kit` → `@esbuild-kit/esm-loader` → a nested `esbuild ~0.18.20`.
  **It has no runtime exposure**: the advisory is esbuild's _dev server_
  accepting cross-origin requests, `drizzle-kit` is a devDependency and
  build-time CLI that never ships to Vercel, and nothing here runs
  `esbuild serve`. `checks.yml`'s `audit` leg is non-blocking at every
  severity (`npm audit --json … || true`) and only comments on the PR.

Moving to the `1.0.0-rc.*` line was scoped as MB.19 and **retired**: it would
trade a stable-but-frozen dependency for a prerelease one, and the advisory it
clears is not reachable. What makes staying put sustainable is MB.20 — dropping
`@pothos/plugin-drizzle` removes the component that tracked the ORM's version
and would eventually have forced the upgrade. With it gone, `drizzle-orm` is
reachable only from the database layer, and is banned by lint everywhere else
(see ["Where queries may be built"](repository-files.md)), so it is a query
builder behind a choke point rather than an architectural commitment.

**Revisit when any of these fires** — not before:

- `drizzle-orm` / `drizzle-kit` `1.0` goes GA on the `latest` dist-tag.
- `drizzle-kit generate` cannot express DDL a task needs. Both candidates are
  now settled, and neither fired. M4.1a: it emitted all three of `ingredients`'
  partial unique indexes, predicates and the `lower(name)` expression included,
  with no hand-editing. M4.6: it emitted the multicolumn trigram index from a
  schema-level `index().using('gin', …)`, both `gin_trgm_ops` operator classes
  included. The one hand-edit that migration carries is an `IF NOT EXISTS`
  added for idempotency (see the [migrations section](migrations-and-scripts.md))
  — a keyword, not DDL the generator could not express.
- The advisory gains a runtime path, or escalates past moderate.

### Debugging a query (MB.22)

`make db-psql` (`docker compose exec postgres psql -U sorrel sorrel`) opens a
prompt against the compose `postgres` service directly. Separately,
`connection.ts` takes an opt-in query logger: `DEBUG_SQL=1` in the
environment makes `drizzle(client, { logger: process.env.DEBUG_SQL === '1' })`
print every statement the repository emits, `withAudit`'s
`set_config('app.current_user_id', …)` included — off by default, so no test
output or CI behaviour changes when it's unset. Full setup:
`claude-docs/testing/debugging.md`.

### Where queries may be built (MB.33)

CLAUDE.md rule 4's other half — a SELECT built anywhere but the repository —
is enforced by a second `no-restricted-imports` group in the same config
entry, banning `drizzle-orm` and `drizzle-orm/*`. A Drizzle query cannot be
built without importing the query builder at runtime, so banning the import
bans the capability: `src/modules/*/services`, `src/graphql`, `src/app`,
`src/components`, `src/lib` and every part of `tests/` outside `tests/db` —
Playwright's `tests/e2e/` included — fail `npm run lint` on a runtime import, whatever the resulting
finder is named or declared as.

`allowTypeImports` keeps `import type` legal everywhere, which is the point
rather than a concession: a type import is erased at compile time and can
build nothing, and it is how DESIGN.md §7's "the GraphQL layer imports
`drizzle-orm` for _types_ only" is now stated in the toolchain instead of only
in prose.

The database layer is exempted by an `overrides` block matching
`src/db/**/*.ts`, `src/modules/*/schema/**/*.ts` (a table is built there),
`tests/db/**/*.ts`, `tests/modules/**/*.ts` and `tests/support/db/**/*.ts`
(its own tests and harness, since MB.41 moved them out of `src/`),
`scripts/**/*.ts` and `drizzle.config.ts`. Two oxlint 1.82
behaviours shape it, and both are load-bearing:

- A rule set to `"off"` or `"allow"` inside `overrides` is **ignored**, so the
  exemption cannot be written as a disable. It is a narrower copy of the rule —
  the client group alone, without the query-builder group.
- An `overrides` block **replaces** the top-level rule config for the files it
  matches rather than merging with it. That is why the copy restates the client
  group verbatim: drop it and the whole database layer would silently lose rule
  2 as the price of being allowed to build queries.

That second failure mode is the one a green test suite would otherwise hide;
it was proved by a probe when the override was written, and is held by review
since MB.224 (lint carries a ban; a test re-running the linter adds nothing).
`lint-db-client-boundary.test.ts` keeps one probe per rule and the exemption
pin below. Its probes live in throwaway `__lint-probe__/` directories inside
the repo (gitignored, removed once linted) rather than in `tmpdir`, because
both rules are scoped by path and a file outside the tree matches no
`overrides` block.

**What each rule makes impossible, rather than merely absent:**

| Rule                            | Impossible                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Client ban (M1.17)              | Reaching `db` — and so a transaction, or an unaudited write — outside the repository and the three exempt files. |
| Query-builder ban (MB.33)       | Building any query at all outside the database layer, including one that would skip `deleted_at IS NULL`.        |
| `selectFrom` unexported (M1.20) | Reaching an unfiltered read from inside the repository.                                                          |
| Access boundary (M3.9)          | A resolver, page or component reaching the repository, or anything under `src/db`, without passing a service.    |

The access boundary is described in
[`graphql/protections.md`](../graphql/protections.md), "The access
boundary". Its second half, `server-only` on every service, stops a client
component from importing a service at all.

**What a `sql` fragment is for** has a file of its own: [`repository-files.md`](repository-files.md).

### What a `sql` fragment is for (MB.100)

Inside the repository a Drizzle builder is used wherever one exists — `eq`,
`isNull`, `gt`, `lt`, `ne`, `inArray`, `exists` — and a `sql` fragment means
either that no builder says it or that a rule keeps it raw. Drizzle 0.45.2
ships builders for every comparison, for set operators (`unionAll`, `.as()`),
for joins and for the plain aggregates (`count`, `max`, …), and none for a
function call, an expression, a cast or a row value. A reviewer reading a
fragment should be able to place it in this list, and one that is not obviously
one of these carries a one-clause comment saying which it is:

| Fragment                                                                                                                                                                                                                                                                                               | Why it is raw                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pg_trgm's `%`, `<%` and `similarity()`                                                                                                                                                                                                                                                                 | No builder; the operators are what the trigram index answers (["Fuzzy matching"](fuzzy-matching.md))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| A function or expression: `lower(btrim(…))`, `unaccent_immutable(…)`, `greatest(…)`, `mode() within group (…)`, `json_agg(…) filter (…)`, `row_number() over (…)`, `now() - make_interval(…)`, `a \|\| ' ' \|\| b`, a `case`, a bare literal in a select list (`select 1`, the union's `0` and `null`) | No builder. The comparison _around_ one is still the builder's — ``ne(sql`btrim(…)`, '')``, ``lt(users.updatedAt, sql`now() - …`)`` — so a fragment holds the expression and nothing else                                                                                                                                                                                                                                                                                                                                                                                                                 |
| A row value and its casts: `(sort, id)` against `(cast(… as <the column's type>), …)`, `(…)::int`                                                                                                                                                                                                      | No builder for a row value, and the cast must be the column's own type (["Keyset pages"](keyset-pages.md)); the `>` and `<` are `gt`'s and `lt`'s                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `set_config(…, true)`                                                                                                                                                                                                                                                                                  | `SET LOCAL` with a bind parameter, which no builder issues (rule 3; ["Fuzzy matching"](fuzzy-matching.md))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| A whole statement: the `union all` arms of a suggestion list, of `findSimilarIngredients`'s match or of `findCompendiumPage`'s search, a `Derived` source, the scalar subquery ranking a folk name, and the `not in (select …)` and `left join (select …)` inside them                                 | **Raw by rule, not for want of a builder.** Drizzle has `unionAll`, `.as()`, `.leftJoin()` and `notInArray(…, subquery)`, but each arm is a `.select(`, and the guard confines those to `select.ts`'s two builders. The arms' fields are the expressions above anyway, so building the frame would leave most of the tags where they are. The cost is the one `existsIn` closed for the four `EXISTS`: an arm's `notSoftDeleted` is by convention, inside a string the guard cannot read. Closing it means a third builder in `select.ts` that hands a union arm out filtered, argued for in its own task |

**A fragment that recurs is written once** (MB.206), in `predicates.ts`:
`fold` is `lower(btrim(…))`, the fold a suggestion, a list entry and a form
compare under; `trigramMatch` is an autofill's `(text % query or query <%
text)`; and `foldedWordMatch` is a search's accent-folded `<%` and
`word_similarity`, the spelling migration 0027's expression indexes answer,
with the `strpos` test of whether a field holds the query verbatim.
`set_config` is written once per purpose too: the trigram thresholds in
`select.ts`'s `readUnder`, which both a similarity read and a keyset read run
under, and the actor's four settings in `src/db/audit.ts`'s `publishActor`,
which `withAudit` and the seed share (MB.208). A finder calls the helper rather
than writing the fragment again, so a change to how a value is folded or
matched is one edit.

What is _not_ on the list, and was raw until MB.100: `… is null` where
`isNull()` serves, the compendium-tier predicate, now `inCompendium` in
`predicates.ts` — read with the proofs' covens through `inTiers` and
`readableInTiers` beside it since MB.206 — a correlated `exists (select 1 …)`, now `existsIn`
(["Soft-delete filtering"](soft-delete.md)), and a comparison written into the
string — `a > b`, `x <> ''`,
`id in (…)` — where `gt`, `ne` and `inArray` take a fragment on either side.
Those were raw by habit, or by the guard's old one-builder mechanism, not by
need. The schema files under `src/modules/*/schema/` are the other place the
`sql` tag appears — index predicates, `CHECK` expressions and column defaults —
and they are DDL, `drizzle-kit`'s input rather than a query, so this list does
not govern them.

### Who may import the client (M1.17)

CLAUDE.md rule 2 — only `src/db/repository/` may import `db` — is enforced
by a `no-restricted-imports` entry in `.oxlintrc.json`. It bans every
relative shape `connection.ts` can be reached by (`./connection`,
`../connection`, `**/db/connection`, with or without the `.ts`), type-only imports included,
so a new importer fails `npm run lint` and the pr-gate lint job.

Exemptions are `// oxlint-disable-next-line no-restricted-imports` comments on
the import itself, not config: oxlint 1.82 **ignores** a rule set to `"off"`
or `"allow"` inside an `overrides` block, so a per-file exemption there would
look like it worked and silently do nothing. Eight files carry one:

| File                                       | Why it needs a client, not a writer                                                                                                                                                                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/db/repository/write.ts`               | The choke point itself — the rule exists to protect it. `withAudit` opens the transaction every write runs in.                                                                                                                                                                  |
| `src/db/repository/select.ts`              | The choke point again: `selectFrom`, the one read query builder.                                                                                                                                                                                                                |
| `src/db/repository/provisional-users.ts`   | The choke point again: the one `users` hard delete, which runs outside `withAudit` (see ["The provisional-account delete"](identity-model.md)).                                                                                                                                 |
| `src/db/repository/sign-in-failures.ts`    | The choke point again: the per-account counter of failed password sign-ins, which runs outside `withAudit` because a failed sign-in has no session to take audit ids from.                                                                                                      |
| `src/db/repository/passkeys.ts`            | The choke point again: removing a passkey unless it is the account's last way to sign in, one transaction under a lock, outside `withAudit` as the passkey plugin's own writes are, since `passkeys` has no audit columns.                                                      |
| `src/lib/auth.ts`                          | Better Auth's `drizzleAdapter(db, …)` takes the Drizzle client. It runs its own inserts through its adapter and database hooks (`claude-docs/auth/admin-bootstrap.md`), so there is no session to hand `withAudit`; the user-create hook stamps `createdBy`/`updatedBy` itself. |
| `scripts/db-seed.ts`                       | The seed CLI constructs the handle it passes to `seed(db, …)`, which writes as the bootstrap user rather than through a session.                                                                                                                                                |
| `tests/db/test-database-isolation.test.ts` | The connection _is_ the subject: it asserts `db` points at this worker's `sorrel_test_<n>` clone (M1.9).                                                                                                                                                                        |

That list is pinned by `tests/guards/lint-db-client-boundary.test.ts`, which
asserts the exemption set is exactly those seven, and lints one deliberate
violation per rule written to a throwaway directory. Adding an eighth turns that test red, so it has to be
argued for in the diff rather than appearing quietly beside an import. The
violations are written at test time rather than committed as fixtures because
oxlint skips anything matching the config's `ignorePatterns` even when the
path is passed explicitly — `--no-ignore` does not override it — so a
committed fixture would have to be lintable by `npm run lint`, and would then
fail the very check it exists to prove.

### Connection URL parameters

postgres.js's parseOptions deletes sslmode, reads the keys in its own defaults, and sends every other query parameter to the server verbatim as a startup parameter, which the server rejects with 42704. CLIENT_ONLY_PARAMS lists the libpq keys it does not consume; listed not derived because deriving would read node_modules at runtime. Deliberately not listed: sslmode (consumed, mapped to ssl), channel_binding (the driver reads it, enforces require, defaults to prefer), application_name and options (real server parameters), and the keys postgres.js names itself: connect_timeout, target_session_attrs, sslnegotiation, prepare, max, fetch_types.

withoutClientOnlyParams strips rather than rejects because a hotfix's URL is written by Neon's Vercel integration, which rewrites the variable itself, so nobody can delete a parameter by hand. channel_binding is kept (the driver enforces it) and sslmode=require requests TLS. It imports nothing because scripts run directly under Node load it as well as Next. A URL with nothing to remove, or one new URL cannot parse, comes back unchanged so postgres.js reports its own error.

### Why some repository files are apart

Spell file placement: grimoire.ts is apart from spells.ts because finders.ts imports readableSpells from there and this pages through finders.ts; ingredient-parent.ts tier predicates are apart from predicates.ts (select.ts imports it) and select.ts (builds queries for any table, names none).
