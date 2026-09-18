# Database — summary

`src/db/connection.ts` is the only place the Postgres driver is instantiated.
It exports `db`, a Drizzle client, built with `drizzle-orm/postgres-js` over
the `postgres` package (pure JS, no native binary). `db` reads `DATABASE_URL`
from the environment at module load and throws if it is unset — no default,
no silent fallback.

- **One driver call site.** Nothing outside `connection.ts` calls `postgres(...)`.
  `src/db/repository.ts` (M1.16) is the only _application_ module that imports
  `db` from here — everything else reaches the database through the
  repository. Three pieces of infrastructure are exempt; see "Who may import
  the client" below.
- **Local Postgres and Neon use the same code path.** `postgres` (the driver)
  parses `sslmode` off the connection string itself, so a Neon URL's
  `?sslmode=require` turns on TLS automatically and a local URL with no
  `sslmode` stays plaintext — `connection.ts` never branches on environment.
- **`drizzle.config.ts`** (repo root) drives `drizzle-kit`: `dialect:
'postgresql'`, schema at `src/db/schema`, migrations output to
  `src/db/migrations`. It reads the same `DATABASE_URL` and throws under the
  same condition.

## Why the ORM stays on 0.45.2 (MB.20)

`drizzle-orm` is pinned to `0.45.2` and `drizzle-kit` to `0.31.10` — the newest
releases on either package's stable dist-tag, and both **deliberately not
upgraded**. The facts, as of 2026-09-17:

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
(see "Where queries may be built"), so it is a query builder behind a choke
point rather than an architectural commitment.

**Revisit when any of these fires** — not before:

- `drizzle-orm` / `drizzle-kit` `1.0` goes GA on the `latest` dist-tag.
- `drizzle-kit generate` cannot express DDL a task needs. Both candidates are
  now settled, and neither fired. M4.1a: it emitted all three of `ingredients`'
  partial unique indexes, predicates and the `lower(name)` expression included,
  with no hand-editing. M4.6: it emitted the multicolumn trigram index from a
  schema-level `index().using('gin', …)`, both `gin_trgm_ops` operator classes
  included. The one hand-edit that migration carries is an `IF NOT EXISTS`
  added for idempotency (see the migrations section) — a keyword, not DDL the
  generator could not express.
- The advisory gains a runtime path, or escalates past moderate.

## Debugging a query (MB.22)

`make db-psql` (`docker compose exec postgres psql -U sorrel sorrel`) opens a
prompt against the compose `postgres` service directly. Separately,
`connection.ts` takes an opt-in query logger: `DEBUG_SQL=1` in the
environment makes `drizzle(client, { logger: process.env.DEBUG_SQL === '1' })`
print every statement the repository emits, `withAudit`'s
`set_config('app.current_user_id', …)` included — off by default, so no test
output or CI behaviour changes when it's unset. Full setup:
`claude-docs/debugging.md`.

## Migrations and scripts (M1.3)

- **`npm run db:generate`** is `drizzle-kit generate` — diffs `src/db/schema`
  against `src/db/migrations` and writes a new migration for any change. The
  first migration (`0000_enable-extensions.sql`) was written by hand with
  `drizzle-kit generate --custom`, since enabling an extension isn't
  something schema-diffing can express; `0001_lucky_centennial.sql` (M2.2) is
  the first one it actually generated, from `src/db/schema/{users,auth}.ts`
  — see `claude-docs/auth.md`.
- **`npm run db:migrate`** is `drizzle-kit migrate` — applies every migration
  under `src/db/migrations` not yet recorded in the `drizzle` schema's
  `__drizzle_migrations` table it creates on first run. That table is what
  makes re-running idempotent: a migration already recorded is skipped, not
  reapplied.
- **`0000_enable-extensions.sql`** runs `CREATE EXTENSION IF NOT EXISTS pg_trgm`
  — the only extension DESIGN.md §5 names (the fuzzy duplicate-name
  warning's `gin_trgm_ops` index). `IF NOT EXISTS` also makes it a no-op
  against `sorrel`/`sorrel_template`, which already have `pg_trgm` baked in
  at the Postgres image's build time (`Docker/postgres-init/`) — the
  migration is what makes a from-scratch database (e.g. Neon) match.
- **`0011_breezy_bastion.sql`** (M4.6) creates `ingredients_trgm`, the
  multicolumn `gin_trgm_ops` index DESIGN.md §9's fuzzy duplicate warning
  reads. `drizzle-kit generate` wrote the statement; the `IF NOT EXISTS` was
  added by hand, for the reason 0000 carries one — the journal already skips an
  applied migration, and the keyword makes re-applying the file a no-op
  independently of it. Hand-editing the SQL is safe here because `db:generate`
  diffs the `meta/` snapshots rather than the statements, so the keyword
  changes nothing a later generate sees.
- **`0016_updated-at-trigger.sql`** (M1.18) is the third hand-written one,
  again via `generate --custom`: it adds the `set_updated_at()` trigger
  function and attaches it to every audited table, neither of which schema
  diffing can express. `CREATE OR REPLACE TRIGGER` (Postgres 14+) is the
  idempotent form — there is no `CREATE TRIGGER IF NOT EXISTS` — so
  re-applying the file is a no-op independently of the journal, for the same
  reason 0000 and 0011 carry an `IF NOT EXISTS`, and it needs no
  destructive-DDL acknowledgement because it drops nothing. See
  "`updated_at` is the database's" below.
- **Migration files are committed**, not generated at deploy/build time —
  `src/db/migrations/**` is real source, reviewed like any other change.
- **`npm run db:seed`** runs `scripts/db-seed.ts`, which calls
  `seed(db, { scenario: 'minimal' })` from `src/db/seed/index.ts`. That
  function exists only as an interface for now — it throws for every
  scenario. The tables it will populate mostly don't exist yet either: Wave 1
  created `users` and Better Auth's three adapter tables, and everything else
  §5 specifies lands in Wave 3. Scenario content arrives scenario-by-scenario
  in M1.21 (`minimal`), M1.22 (`standard`), and M1.23 (`demo`); scenario
  selection by environment variable is M1.24.
- **`npm run db:reset`** is `db:migrate` then `db:seed` — real plumbing, but
  it fails until `db:seed` has something to do. The Docker-level reset (init
  hook, `make db-reset`, drop-and-recreate from a broken state) is M1.24.
- **`Docker/postgres-init/enable-extensions.sql`** also creates the `sorrel`
  role and database now, not just `pg_trgm`. Without it, a container built
  from `Dockerfile.postgres` would never get a `sorrel` role/database at
  all: `PGDATA` is already populated at image build time, so the entrypoint's
  usual first-boot "create `POSTGRES_USER`/`POSTGRES_DB` from env" step never
  runs for it. Still no schema or seed data — that's M1.27.
- **`sorrel` holds `CREATEDB` and owns `sorrel_template`** (M1.9), granted in
  the same init script. `postgres`'s own password is generated and discarded
  within that build step (`Dockerfile.postgres`), so `sorrel` is the only
  role any runtime connection can ever authenticate as — and cloning a
  database as a template requires either owning it or being a superuser.
  This is what lets the Vitest `db` project's `globalSetup` (`src/test/
db-global-setup.ts`) run `CREATE DATABASE sorrel_test_<n> TEMPLATE
sorrel_template` as `sorrel`. See `testing.md`.
- **`npm run db:studio`** (`make db-studio`, MB.21) is `drizzle-kit studio
--host 0.0.0.0 --port 4983`. It reads the same `drizzle.config.ts` as
  `db:generate`/`db:migrate` — no separate configuration — and needs no
  schema or seed data to work, it just shows empty tables until M1.21–M1.23
  land. The UI itself is hosted at `https://local.drizzle.studio`; the page
  connects from the browser back to `127.0.0.1:4983`, so the server only
  ever needs to serve data, never a UI bundle. From the devcontainer, run
  `npm run db:studio` directly (no `make`/`docker` there) — port 4983 is
  forwarded by `.devcontainer/devcontainer.json`. From the host, `make
docker-studio` starts it as a profiled compose service (`studio`), the
  same shape as `workshop`; `make docker-all` brings up every long-running
  service, studio included.

## Workspaces and membership (M6.2)

`src/db/schema/workspaces.ts` holds DESIGN.md §5's two workspace tables and
the `workspace_role` enum (`viewer`, `member`, `owner` — declared in that
order, which is the hierarchy M6.3's `assertMembership` implements).
`0004_black_slyde.sql` is the migration.

- **`workspaces`** — `id`, `name`, `slug`, + audit, and **nothing else**.
  There is no `kind` column and no automatically created workspace: every
  workspace behaves identically, taking members and being deleted by an owner.
  `workspaces-schema.test.ts` pins the whole column set rather than asserting
  the absence of one name, so a later `kind`/`type`/`personal` column turns it
  red instead of going unnoticed. The entity is `workspaces` even though it
  routes under `/coven/[slug]`; only the URL segment says coven (§5's naming
  note).
- **`workspaces_slug_unique`** is partial on `deleted_at IS NULL`, per the
  convention above — the slug is what `/coven/[slug]` routes on, so a plain
  unique constraint would let a deleted workspace hold a name hostage forever.
- **`workspace_members`** — `workspaceId`, `userId`, `role`, `joinedAt`, +
  audit, with a composite primary key on the pair and no surrogate `id`. The
  pair _is_ the membership's identity: a surrogate key would let the same user
  join the same workspace twice, with two rows disagreeing about their role.
  `joinedAt` is deliberately distinct from `created_at` — a role change
  rewrites the row without changing when the person joined.
- **`owner` is a role here but not an invitable one.** That narrowing lives on
  `workspace_invitations` (M7.1), whose check constraint rejects it — see
  "Invitations" below; ownership is granted afterwards by an existing owner on
  the members page.
- Both tables carry the full six-column audit spread, and every `*_by` column
  references `users.id` as MB.5 specifies. `workspace_members` keeps all six
  despite being a join table — MB.34 hard-deletes three others, and this is not
  one of them: who removed whom, and when, is worth keeping. The tables are inert at Wave 3 —
  nothing queries them until M6.3's service and its `Membership` proof land in
  Wave 5, which is the point of CLAUDE.md's table-task-then-behaviour-task
  rule.

## Invitations (M7.1)

`src/db/schema/workspace-invitations.ts` holds DESIGN.md §5's third workspace
table, reusing the `workspace_role` enum declared beside `workspaces`.
`0012_cultured_ben_grimm.sql` is the migration.

- **`workspace_invitations`** — `id`, `workspaceId`, `email`, `role`,
  `tokenHash`, `expiresAt`, `acceptedAt`, `acceptedBy`, `revokedAt`, + the full
  six-column audit spread. `email` is text and **not** a foreign key: an
  invitee has no account yet, which is the point of inviting them.
- **Only the hash is stored.** There is no plaintext column and there must
  never be one — story 4's requirement is that a leaked database row cannot be
  redeemed. M7.2 generates the token with `crypto.randomBytes` and hashes it,
  M7.3 returns the URL exactly once in the mutation response, and every later
  read matches a hash against `token_hash`. The schema test pins this as a
  property of the whole table rather than of one column ("the only column whose
  name mentions a token is the hash"), so a later `invite_token` reddens it.
- **`workspace_invitations_role_invitable`** is the check constraint DESIGN.md
  §5 requires: `role in ('viewer', 'member')`. Written as the allowed set
  rather than as `role <> 'owner'` deliberately — `workspace_role` has three
  values today, and a fourth added later would be silently _invitable_ under
  the negative form and silently refused under this one. Refusing is the safe
  default for the column that decides what a stranger holding a link may do. In
  the database rather than the service because a service check can be forgotten
  by the next code path that writes the table, and a constraint cannot.
- **Expiry defaults to seven days** (`now() + interval '7 days'`), and the
  column is `NOT NULL`. §5 names no figure, so M7.1 chose one and recorded why
  at the constant: long enough that a link mailed on a Friday survives the
  weekend, short enough that one found in an old inbox is dead. It is a
  default, not a policy — M7.3 may pass its own — and what the `NOT NULL`
  buys is that omitting one cannot produce an invitation valid forever.
- **`workspace_invitations_token_hash_unique`** is the acceptance path's
  lookup, and unique as well as indexed: one hash must resolve to at most one
  invitation, or redeeming it is a coin toss between two rows that may name
  different roles. Partial on `deleted_at IS NULL` per the convention below.
  The usual argument for that predicate is weak here — nothing re-proposes a
  particular random hash — but the rule is absolute and the predicate is free.
- **Four lifecycle columns, not one `status` enum.** `expiresAt` is a clock
  comparison, `revokedAt` is an owner's act, and `acceptedAt`/`acceptedBy` are
  the redeemer's. Story 7 wants all three told apart with a deterministic
  answer when two apply at once, and collapsing them is exactly the shape MB.30
  rejected in Better Auth's plugin, which answers every dead link with one
  `INVITATION_NOT_FOUND` (`design-decisions/mb.30-organization-plugin.md`).
  M7.7 owns the classification; the table owns keeping the evidence apart.
- **No constraint pairs `acceptedAt` with `acceptedBy`.** §5 names one check on
  this table and it is the role one; acceptance is a single service write in
  M7.5, where the pairing is one statement rather than an invariant the
  database has to be taught.
- The table is inert at Wave 3 — nothing queries it until M7.2's token service
  and M7.3's mutation land in Wave 10, which is CLAUDE.md's
  table-task-then-behaviour-task rule working as intended: the DDL is
  constrained while the table is empty.

## The ingredient identity model (MB.28, table M4.1)

DESIGN.md §5 specifies three tables that land in Wave 3: M4.1 creates
`ingredients` (the enums, columns, generated key, and CHECKs) — **merged**,
`src/db/schema/ingredients.ts`, migration `0005_uneven_bloodstorm.sql`; M4.1a
adds its three partial unique indexes — **merged**, same schema file, migration
`0006_wandering_mockingbird.sql`; M4.2a creates `ingredient_forms` —
**merged**, `src/db/schema/ingredient-forms.ts`, migration
`0008_unknown_lyja.sql`; and M4.4a creates `ingredient_folk_names` —
**merged**, `src/db/schema/ingredient-folk-names.ts`, migration
`0010_broken_shiver_man.sql`. MB.28
recorded the model here first, ahead of that DDL, so M4.1 was transcription
rather than design — the same reasoning as CLAUDE.md's table-then-behaviour
rule, one step earlier: cheapest to get right before anything depends on it.
What follows describes all three as built.

- **`ingredients`** — `id`, `workspaceId` (nullable: `NULL` is the compendium
  tier, non-null is a workspace's own ingredient), `name`, `canonicalName`,
  `nomenclature`, `form`, the generated `canonicalKey`, the correspondence
  columns (`description`, `element`, `planet`, `zodiac`, `deities[]`, `color`,
  `safetyNotes`, `substitutes[]`), + audit. `name` is the display label —
  what it's called here — and stays freely relabellable, because identity
  moved off it onto `canonicalName`/`nomenclature`/`form`. Of the
  correspondences only `element` is constrained: an `ingredient_element`
  `pgEnum` of `earth`, `air`, `fire`, `water`, `spirit`, closed and fixed —
  the exact opposite of `form`, and the reason the two are easy to confuse
  but never interchangeable. `deities` and `substitutes` are native
  `text[]` columns, one of the things SQLite could not have run (DESIGN.md
  §14). Four indexes: M4.1a's three partial unique ones (below) plus
  `ingredients_trgm` (M4.6), one multicolumn `gin_trgm_ops` index over `name`
  and `canonical_name` — see "Fuzzy matching" below.
- **`ingredient_folk_names`** — `id`, `ingredientId` (FK to `ingredients`),
  `name`, + audit. Common names, one row each, scoped to the ingredient that
  claims them. Two indexes: `ingredient_folk_names_unique` over
  `(ingredient_id, lower(name))`, partial on `deleted_at IS NULL`, and
  `ingredient_folk_names_trgm`, a plain `gin_trgm_ops` index on `name` — which
  is what M4.7's common-name matching reads, and what the array column it
  replaces could not have carried. The surrogate `id` is not redundant beside
  that unique index: the index is unique among _live_ rows only and a primary
  key carries no predicate, and M8.3a's promotion swaps one named row rather
  than reconstructing a pair. No locale or region column — DESIGN.md §5 records
  no regional requirement and nothing renders one.
- **`ingredient_forms`** — `id`, `name`, `slug`, `groupId`, `description`, +
  audit. Shaped like `categories`: global, admin-curated, no workspace
  scoping. This is the third resource admins curate globally, alongside the
  compendium and categories (CLAUDE.md). Its `groupId` points at
  `ingredient_form_groups`, admin-curated in turn — see the categories
  section below, which settles both (MB.35).

**`nomenclature`** is a seven-value `pgEnum`, `NOT NULL` with no default:
`botanical`, `fungal`, `zoological`, `mineral`, `chemical`, `unknown`, `none`.
It names _which naming system_ a formal name belongs to, not which rank
within that system — `Quartz var. amethyst` and `Lapis lazuli` are both
`mineral` even though one is an IMA variety and the other a rock. `unknown`
and `none` are both answers, not the absence of one: `unknown` means a formal
name exists in some system but nobody has looked it up yet (`WHERE
nomenclature = 'unknown'` is a findable curation to-do list); `none` is the
positive claim that no naming system names this thing at all (graveyard
dirt, moon water, black salt). A CHECK ties the two together —
`(nomenclature IN ('none','unknown')) = (canonical_name IS NULL)`, enforced
in both directions, so the enum value and the presence of a formal name can
never disagree.

**`canonical_key`**, the generated identity column:

```sql
canonical_key text NOT NULL GENERATED ALWAYS AS (
  lower(COALESCE(canonical_name, name))
  || COALESCE(' :: ' || lower(btrim(form)), '')
) STORED
```

Every function in that expression — `lower`, `btrim`, `||`, `COALESCE` — is
IMMUTABLE, which Postgres requires of anything inside a `GENERATED ALWAYS AS
(...) STORED` column (the same requirement applies to expression indexes).
That's also why `form` had to lose its `pgEnum`: casting to an enum type
raises an immutability question a plain `text` column doesn't, so relaxing
`form` to text is what makes this generated column legal at all. Folding
`form` into the key, rather than keying on the formal name alone, is what
lets _Valeriana officinalis_ root and leaf exist as two separate identities.

**Three CHECKs ship with the table**, named
`ingredients_nomenclature_declares_canonical_name` (the biconditional above),
`ingredients_canonical_name_not_blank` and `ingredients_form_not_blank`. The
two non-blank checks exist because `btrim(x) <> ''` is what the biconditional
cannot say for itself: `canonical_name = '   '` satisfies "not null" while
contributing nothing to the identity key. Their expressions, and the
generated column's, are written as literal SQL rather than interpolated
Drizzle columns, and transcribe DESIGN.md §5's SQL verbatim. The generated
column has no choice — it names columns of the table whose column object is
still being built, so there is nothing to interpolate from. Postgres itself
would accept a table-qualified self-reference in either place (verified
against this database on 18.6); the limitation is Drizzle's.

**How the table is tested before M1.27 bakes it into the template.**
`sorrel_template` still carries no application tables, so
`src/db/ingredients-schema.test.ts` applies the migration that ships this
table into the worker's own `sorrel_test_<n>` clone — locating it by
searching `src/db/migrations` for the file that creates `ingredients`, then
executing its statements — and drops it again afterwards. What the
constraint assertions exercise is therefore the SQL production runs rather
than a hand-copied paraphrase of it. `users` and `workspaces` are stubbed to
the single `id` column the foreign keys point at rather than migrated:
running Drizzle's migrator here would leave a `__drizzle_migrations` table
behind in a clone the next test file in that worker expects not to have one
(`test-database-isolation.test.ts` asserts exactly that). The shape half of
the file needs no database at all and reads `getTableConfig`, the same as
`workspaces-schema.test.ts`.

**Three partial unique indexes, not two, and indexes rather than
constraints** — M4.1a, as built:

```sql
CREATE UNIQUE INDEX ingredients_compendium_identity_unique
  ON ingredients (canonical_key)
  WHERE workspace_id IS NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX ingredients_workspace_identity_unique
  ON ingredients (workspace_id, canonical_key)
  WHERE workspace_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX ingredients_workspace_label_unique
  ON ingredients (workspace_id, lower(name))
  WHERE workspace_id IS NOT NULL AND deleted_at IS NULL;
```

All three carry `WHERE deleted_at IS NULL`, per the partial-index convention
above — deleting a row must not permanently reserve its identity or its
label (CLAUDE.md rule 4). The label index is workspace-tier only: inside one
workspace an ambiguous label is a mistake, but the compendium deliberately
allows several rows to display the same label (four unrelated "Cat's Claw"
entries) as long as they're different identities. They're indexes rather
than unique constraints because Drizzle's `nullsNotDistinct()` exists only
on constraints, and a constraint can't carry a `WHERE` predicate at all —
since every unique index in this schema must be partial, the constraint form
was never on the table regardless. Two indexes over the two tiers rather than
one over `(workspace_id, canonical_key)` for the same reason: without
`NULLS NOT DISTINCT`, every compendium row's null `workspace_id` would be
distinct from every other's and the single index would reserve nothing there.

**The predicates are asserted from the catalogue, not just the behaviour**
(`src/db/ingredients-indexes.test.ts`, which applies `0005` and `0006` into
the worker clone the same way described above). Each index's
`pg_get_expr(indpred, indrelid)` is pinned to its rendered predicate and its
`pg_get_indexdef` to its key columns, and one test asserts the table carries
no fourth unique index. Behaviour alone could not catch a dropped
`WHERE deleted_at IS NULL`: no collision test re-uses an identity without
soft-deleting first, so every one of them would stay green while the
reservation silently widened to forever. Verified by mutation — dropping the
predicate reddens six tests, dropping the label index five, and keying the
compendium on `lower(name)` instead of `canonical_key` four.

**`ingredients.form` is `text`, and deliberately not a foreign key to
`ingredient_forms`.** The curated table is an autofill vocabulary, not a
constraint: a foreign key would force identity to key on a surrogate id and
make an uncurated value like `rhizome` unwritable until an admin curates it
first. M4.2a asserts the absence of that foreign key by test, since it's the
property the whole free-text design rests on.

**Folk names got their own table instead of staying `folkNames text[]`
because of one verified fact.** On this repo's live PostgreSQL 18.6,
`array_to_string` is **STABLE** (`pg_proc.provolatile = 's'`), not IMMUTABLE,
so it's legal in neither a generated column nor an expression index — a
trigram index over a `text[]` column would have needed a hand-written
IMMUTABLE wrapper. As a normalized table, `ingredient_folk_names` carries a
plain `gin_trgm_ops` index on `name` directly, plus a unique index on
`(ingredient_id, lower(name))` partial on `deleted_at IS NULL` —
uniqueness is per ingredient, deliberately not global, since several
unrelated ingredients claiming the same common name is exactly what's being
documented, not an error. `lower`, `btrim`, and `similarity`, by contrast,
are all IMMUTABLE and used freely throughout this model.

### Fuzzy matching: one index, and a rule every caller is bound by (M4.6)

**`ingredients_trgm` is one multicolumn index, not two single-column ones.**
`USING gin (name gin_trgm_ops, canonical_name gin_trgm_ops)` — a multicolumn
GIN index is reachable from a predicate naming either column on its own, which
is a property of the access method rather than a hope, and
`ingredients-trigram.test.ts` asserts it by `EXPLAIN` for each column
separately. Reduce it to `name` alone and the `canonical_name` assertion
reddens. It is neither unique nor partial: the three unique indexes _reserve_
an identity, so a tombstone must fall outside them, while this one only answers
"what is this called" for a finder that filters `deleted_at` itself.
`ingredient_folk_names_trgm` stays its own index over its own table (M4.4a),
and is reached independently.

**The index is only half of it. A match must be written `name % $1`, with
`pg_trgm.similarity_threshold` set per transaction — never
`similarity(name, $1) > 0.4`.** The two return the same rows, so nothing but
the query plan tells them apart, and getting it wrong is silent in both
directions:

- `similarity(a, b) > 0.4` is a **function call**, and no trigram index can
  answer one. Only the operators (`%`, `<->`) are indexable. A query written
  that way sequentially scans `ingredients` no matter what indexes exist — and
  it does so even with `enable_seqscan = off`, which is how the test asserts it
  rather than merely observing a planner preference.
- `%` alone means "similar by `pg_trgm.similarity_threshold`", which defaults
  to **0.3**, not the 0.4 DESIGN.md §9 specifies. So the threshold is set with
  `SET LOCAL` inside the matching transaction, and does not leak past it.

One is a correctness bug in the results, the other a performance bug invisible
until the table is big. M4.7's fuzzy duplicate service is the first caller
bound by both.

**Accent insensitivity is client-side only.** `unaccent` is not installed in
this database (only `pg_trgm` is, per the migrations section above), so
there's no server-side normalization path to lean on — a deliberate scope
limit, not a gap left for later.

Full column list, the CHECK constraints' exact text, and the
local-beats-compendium resolution query that reads these indexes: DESIGN.md
§5.

## Categories, and the two group vocabularies (MB.35; tables M4.2, M4.2a)

DESIGN.md §5 specifies four tables here, and all four are now written: M4.2
added `category_groups` and `categories` in migration
`0007_even_wild_pack.sql`, and M4.2a added `ingredient_form_groups` and
`ingredient_forms` in `0008_unknown_lyja.sql`. MB.35
recorded the model first, as MB.28 did for ingredients — and for a sharper
reason: M4.2 had already been built and verified as a `category_group`
pgEnum before the question "can an admin add a ninth group?" was asked. The
enum was a faithful transcription of §6's closed eight and had to be thrown
away.

- **`categories`** — `id`, `name`, `slug`, `description`, `groupId` (FK to
  `category_groups`), + audit. Global, admin-curated, no workspace scoping.
  §6 seeds 52. **No colour of its own** — see below.
- **`category_groups`** — `id`, `name`, `slug`, `colorDark`, `colorLight`,
  `description`, + audit. Global, admin-curated. §6 seeds eight; an admin
  may add more. Listed alphabetically by `name`.
- **`ingredient_forms`** — as in the identity section above, with `groupId`
  (FK to `ingredient_form_groups`) in place of the earlier `group` text.
- **`ingredient_form_groups`** — `id`, `name`, `slug`, `description`, +
  audit. Seeds _organism part_, _preparation_ and _matter_. No colour: form
  groups section an autofill dropdown, not chips. Also alphabetical.

A category reaches an ingredient through `ingredient_categories` (M4.4) and a
spell through `spell_categories` (M10.4), both join tables and so both
hard-deleted — each has its own section below.

**Groups are rows, not enums, because an admin mutation cannot run DDL.**
`ALTER TYPE … ADD VALUE` is a migration, migrations here are forward-only and
CI-gated, and the whole point of the change is that adding a group needs no
deploy. As a table the group also gets what an open set needs and a closed
one could imply: a colour per row, below. It does _not_ get an order column
— groups list alphabetically by `name`, which needs nothing stored and puts
an admin-added group where a reader would look for it.

**Two group tables, not one with a `kind` column.** A shared table with a
discriminator would let `categories.groupId` point at a form group, and the
mistake would surface only when a chip section rendered empty. Two tables
make it a foreign-key violation — impossible rather than merely absent, for
the price of one more `CREATE TABLE`.

**Both `groupId`s are foreign keys, and `ingredients.form` is not — that is
a rule, not an inconsistency.** `ingredients.form` is written by a _member_,
who must be able to write `rhizome` before an admin has curated it, so it is
text over a vocabulary. A category, a form, and the groups they point at are
written only by admins, on both sides, so an FK blocks nobody — and a
typo'd group would otherwise silently empty a section. Generalised: a
vocabulary a member writes is text; a vocabulary only an admin writes is a
foreign key.

**A group's colour is two hexes on the row, one per theme, each validated on
write — not a build-time token.** M0.7 emits one `--group-<slug>` custom
property per key of `$category-groups` at Sass compile time, which is
exactly what a group created at runtime cannot have. So the map becomes the
**seed source**: it already carries a `dark` and a `light` value per group,
and M4.3 resolves each to a hex once and writes both onto the row, carrying
M0.7's hue rotation and per-theme contrast tuning across into data. From
then on the chip reads the row (MB.36 changes the mixin to take the pair).
Two columns rather than one because the grounds differ — M0.7 lifts a
dark-theme colour and darkens a light-theme one, and no single hex clears
4.5:1 on both soot and parchment without being mud on at least one. The
validation is M5.6b's, in the service and not a CHECK constraint, because
the failure needs a readable message and the ground to compare against:
`colorDark` is checked against the dark ground only, `colorLight` against
the light, so each floor is exact. What an admin adds is legible in both
themes but does not join the rotation — the accepted cost of an open set,
stated in §6 rather than glossed.

**The colour lives on the group only, and a category has none (M4.2).** §5,
§6 and this file all listed a `color` on `categories` until the table was
written, carried over from before MB.35 made a group's colour a _pair_ of
hexes — which a single category column cannot hold either half of, and which
M4.3 has nothing to seed a per-category counterpart from, since the
resolution it describes writes onto the group row. One source for a chip's
colour, rather than a per-category override shadowing a per-group value; §6's
grouping exists so 52 chips read as eight families in the first place. If a
per-category override is ever wanted it is addable as a widening.

**Uniqueness is on `slug`, partial on `deleted_at IS NULL`, on all four
tables** — `category_groups_slug_unique`, `categories_slug_unique`,
`ingredient_form_groups_slug_unique` and `ingredient_forms_slug_unique`, the
partial-index convention below. Slug uniqueness is global rather than per
group on both child tables: the slug is what a chip filter and M4.3/M4.3a's
idempotency keys read, and none of them carries a group alongside it. Display
names carry no constraint: two groups may each want a "Protection", and the
slug is what tells them apart.

**On `ingredient_forms` that last sentence has a consequence the other three
do not have, and it is deliberate.** A category is referenced by **id**, so
two categories sharing a display name are only two similar chips.
`ingredients.form` stores the **string**, so two live forms both called "Root"
— one an _organism part_, one a _preparation_ — are indistinguishable to
everything downstream: whichever the member picks, the same `Root` lands on
the row, and the second curated entry can never be attributed to anything.
M4.2a's acceptance criteria originally asked for a partial unique index on
`name` here, which would have refused the second row outright. It was dropped
in favour of MB.35's slug-only rule for two reasons: a unique index on `name`
is case-sensitive, so it would still admit "Root" beside "root" — two
identical strings once `canonicalKey` lowercases `form` — and _wax_ is
legitimately both a part of the bee and a preparation of it, which the index
would force an admin to rename their way out of. **The disambiguation moved to
the autofill instead**: M4.7a returns each curated suggestion's group and
M5.10a renders it, so the dropdown offers "Root (organism part)" beside "Root
(preparation)". The schema test asserts the same-named pair is _accepted_, so
the gap stays a recorded decision. Adding the index later is the reversible
direction — `CREATE UNIQUE INDEX` is expand-direction DDL that only fails if
duplicates already exist, where dropping one is a `DROP` needing a PR
acknowledgement (rule 10).

**NOT NULL on every remaining §5 and §6 field** — `name`, `slug` and
`description` on all four tables, both hexes on a category group, and
`groupId` on a category and on a form (FKs
`categories_group_id_category_groups_id_fk` and
`ingredient_forms_group_id_ingredient_form_groups_id_fk`). Constraining now is
the reversible direction: dropping a `NOT NULL` later is a widening, where
adding one is destructive DDL needing a PR acknowledgement (rule 10, and the
section below).

**The two form tables go one step further than NOT NULL on `description`**, in
`ingredient_form_groups_description_not_blank` and
`ingredient_forms_description_not_blank`: §5 asks for a description that is
required _and non-empty_, and `NOT NULL` alone accepts `''` and `'   '` — a
curated value that curates nothing, when the whole point of the column is that
`rootBark` can say "the bark of the root, not the stem". It is a CHECK rather
than service-side validation, unlike M5.6b's contrast floor, because "say
something" needs no ratio in its error message. The two category tables carry
no counterpart: §5 asks for non-empty only on the form vocabulary, so M4.2
shipped NOT NULL alone and this is a difference in the specification, not a
gap in M4.2.

## Stock, and the one module that owns the units (M9.2)

`src/db/schema/inventory-items.ts` holds DESIGN.md §5's stock table;
`0013_illegal_red_hulk.sql` is the migration. The unit vocabulary it is built
from lives outside the database layer entirely, in `src/lib/units.ts`.

- **`inventory_items`** — `id`, `workspaceId`, `ingredientId`,
  `quantityOnHand`, `unit`, `unitDimension`, `lowStockThreshold`, `source`,
  `acquiredDate`, + the full six-column audit spread. Story 20's table: what a
  workspace _holds_, as against what exists (the compendium) and what it makes
  (the grimoire).
- **Stock hangs off the ingredient, never the other way round.** A compendium
  entry carries no quantity; an ingredient gains one only when a workspace adds
  it, which is this row. It is also why `spell_ingredients` (M10.2) references
  `ingredients` rather than this table — a saved spell survives running out of
  something, and M10.21 tests exactly that.
- **`inventory_items_workspace_id_ingredient_id_unique`** is §5's partial
  unique index on `(workspace_id, ingredient_id) WHERE deleted_at IS NULL`. It
  is what "already added" _means_: M9.4's `addIngredientToWorkspace` is
  idempotent against it rather than defining the notion again. The predicate is
  load-bearing rather than ceremonial here — story 25 soft-deletes a row and
  calls it recoverable, so without it, throwing a jar out would reserve that
  ingredient against ever being stocked again. Verified by rebuilding the
  shipped migration with the predicate stripped, where re-adding after a
  soft delete is refused with a unique violation.

### One module owns the units

`src/lib/units.ts` is the single source of the vocabulary — three dimensions,
metric and imperial in each: weight (mg, g, kg, oz, lb), volume (ml, l, tsp,
tbsp, fl_oz, cup), count (piece, drop, pinch). Both pgEnums (`inventory_unit`,
`unit_dimension`), the CHECK constraint below, M9.5's `unitConvert()`, M9.8's
badges and every later Zod enum are built from it. **Adding a unit is one
edit** — that map, plus a regenerated migration.

It imports nothing, and that is what makes it importable from all three sides:
the schema imports it, and so do the conversion library and the Zod schemas,
which must not reach the database layer at all (rule 2, MB.33).

`fl oz` is stored as **`fl_oz`**. §5 names the unit in prose, where a space is
how a human writes it; the stored label has to survive a Postgres enum, a
GraphQL enum (M9.4) and a URL query parameter (M9.7's filter chips), and of
those a GraphQL enum value cannot contain a space at all. The unit is §5's;
only its spelling is settled here, and how it is _displayed_ stays a question
for the UI tasks rather than a column value.

The schema file is forbidden to spell a unit or a dimension out, and that is
asserted as a property of its source text rather than of its values: equal
lists stay equal when someone pastes the vocabulary in beside the import, while
a literal `'tsp'` in the file's code does not survive the guard. Comments are
stripped before the scan — prose quoting `unit_dimension = 'weight'` to explain
the constraint is what a reader needs, and a comment cannot drift from the
module because nothing reads it.

### The dimension stored beside the unit

`unitDimension` is stored rather than derived at each call site, so a query can
filter or group by it and M9.5 has something to check against. The redundancy
is deliberate, and `inventory_items_unit_matches_dimension` is what pays for
it: a row whose dimension contradicts its unit cannot be written. The
expression is generated from the same map the enums are, so the constraint
cannot fall behind the vocabulary it constrains.

It is written as two conjuncts, and the first is not optional:

```sql
(unit is null) = (unit_dimension is null)
and (unit is null or ((unit_dimension = 'weight' and unit in ('mg', …)) or …))
```

A CHECK passes on NULL, so `unit_dimension = 'weight'` against a null dimension
evaluates to NULL rather than to false — and a disjunction of dimension clauses
_alone_ therefore admits exactly the half-null rows it looks like it refuses.
That was the first version of this expression, and the test caught it: `unit =
'g'` with no dimension beside it inserted cleanly. The biconditional between
two `is null` tests — the idiom `ingredients_nomenclature_declares_canonical_name`
already uses — has non-null booleans on both sides and is decisive either way.
Both failure modes were then re-verified against the shipped migration with
each half stripped in turn.

A stub row (both null) is admitted, because it claims nothing and so
contradicts nothing.

### Nullability, and why zero is not the same as nothing

`quantityOnHand` is nullable because **zero is already taken**: M9.8 renders
`0` as out of stock, so a NOT NULL column with no default would force every add
to claim a number it may not have, and "held, not yet weighed" would be
unsayable except as a lie. `unit`, `unitDimension`, `lowStockThreshold`,
`source` and `acquiredDate` are nullable for the same reason and are pinned by
test: `0.000` and `NULL` are asserted to be distinguishable on the row.

- `quantityOnHand` and `lowStockThreshold` are `numeric(12, 3)`, not floats:
  0.1 kg has to come back as 0.1, and M9.5's round-trip criterion is unmeetable
  on a type that cannot represent the input. Three decimal places is a
  milligram expressed in grams — the finest distinction any unit pair in the
  vocabulary can make — and §5 names no figure, so the reasoning sits at the
  column.
- `lowStockThreshold` carries **no database default**. M9.8 writes a
  dimension-appropriate value onto the row at creation (3 for count, 10 g for
  weight, 15 ml for volume, converted into the row's unit) rather than applying
  a constant at read time, so it stays visible and editable and changing the
  constant later does not silently reinterpret every existing row. A column
  default could not do it anyway: the value depends on the row's own unit,
  which a default cannot see.
- `source` is where the _stock_ came from — "Miller's farm stand", "foraged by
  the creek" — free text and member-written, per §5's rule that a vocabulary a
  member writes is text while one only an admin writes is a foreign key. It is
  **not** story 27's local-versus-compendium distinction, which M9.7 reads off
  `ingredients.workspace_id` and which never touches this column: that is where
  the _entry_ came from, this is where the stock did.
- `acquiredDate` is a `date`, not a timestamp. Nobody records the hour they
  were handed a jar.

No other constraint is declared. Non-negative checks on the two quantities
would be reasonable and §5 does not name them, so they are not here — the rule
against hooks the design doc does not name applies to CHECKs as readily as to
columns. A negative quantity is a validation error with something to say, which
makes it the service and Zod layers' job rather than a constraint's.

The table is inert at Wave 3: nothing queries it until M9.3's service and
M9.4's mutations land in Wave 11, which is the table-task-then-behaviour-task
rule and the reason the DDL can be constrained now, while the table is empty.

## The grimoire (M10.2)

`src/db/schema/spells.ts` and `src/db/schema/spell-ingredients.ts` hold
DESIGN.md §5's two grimoire tables; `0014_cooing_bug.sql` is the migration.
What a workspace _makes_, as against what exists (the compendium) and what it
holds (`inventory_items`).

- **`spells`** — `id`, `workspaceId`, `title`, `intent`, `jarSize`,
  `sealWaxColor`, `moonPhase`, `dayOfWeek`, `instructions`, `status`, + the full
  six-column audit spread. Stories 47 and 50's table.
- **`spell_ingredients`** — `spellId`, `ingredientId`, `quantity`, `unit`,
  `layerOrder`, `note`, + the four audit stamps, keyed on
  `(spell_id, ingredient_id)` and hard-deleted (MB.34).

**`visibility` is not on `spells` yet, and its absence is scheduled rather than
forgotten.** §5 lists the column and M10.3 adds it in Wave 5, after M1.23 has
seeded spells against this table — which is what makes M10.3's criterion,
"existing seeded spells migrate to workspace visibility", something that can
actually be tested (TASKS.md, "Breaking the M1.23 ↔ M10.3 cycle"). Adding it
early would quietly delete that criterion, so `spells-schema.test.ts` asserts
the column list exactly and names the column as the one that must still be
absent.

### The join names the ingredient, never the stock row

`spell_ingredients.ingredientId` references `ingredients`. Stock is what a
workspace happens to hold today; a recipe pointing at it would be damaged by
running out of something, and M10.21 tests exactly that. The test proves the
target rather than asserting it twice: an id that exists only in
`inventory_items` is refused with a foreign-key violation naming
`spell_ingredients_ingredient_id_ingredients_id_fk`, while the same insert
against an ingredient the workspace holds no stock of is accepted. Repoint the
key and the pair swaps which one reddens.

### Layer order, and what it costs the reorder

`layerOrder` is `integer NOT NULL`, unique within a spell through
`spell_ingredients_spell_id_layer_order_unique` on `(spell_id, layer_order)`.
Both halves are load-bearing:

- **Stored, not inferred.** Story 51 makes layering part of the recipe, and no
  query may lean on insertion order.
- **NOT NULL**, because a nullable column would satisfy neither half of "stored
  and unique within a spell" — distinct NULLs collide with nothing, so an
  unordered row would sit outside the index meant to constrain it.
- **Leading on `spell_id`**, which both scopes the uniqueness to the one jar and
  makes this the index that answers "read this spell's ingredients in order" —
  every read of the table in M10.9 and MB.6.
- **Not partial**: there is no `deleted_at` here to write a predicate against.

A unique index is checked per row rather than at end of statement, so **M10.16's
reorder cannot be a single `set layer_order = layer_order + 1` sweep** even
though the final state is conflict-free. It rewrites the jar's rows instead,
which a hard-deleted table makes an ordinary delete-and-insert. The schema test
pins both directions — the sweep is refused, the rewrite succeeds — so the
constraint the reorder has to work within is written down before the reorder is.

### The rest of the calls, and the ones not made

- **`status` is a `spell_status` enum defaulting to `draft`**, on the column
  rather than in the service: M10.20's "new spells default to draft" is a
  default that lives in one code path only if it is written where every code
  path meets it. An enum rather than a text column with a CHECK because §13's
  viewer-approval workflow adds `proposed` and `approved` to this same column in
  v2 — `ALTER TYPE ... ADD VALUE` is expand-only, where widening a CHECK
  re-validates every existing row.
- **`title` is the only required field on a spell.** §8's acceptance example
  creates one with a workspace and a title and nothing else, and a draft is the
  state a spell is saved in _before_ it is finished. `intent`, `jarSize`,
  `sealWaxColor`, `moonPhase`, `dayOfWeek` and `instructions` are all nullable
  free text — §5's rule that a vocabulary a member writes is text, and there is
  no curated list of moon phases or wax colours anywhere in the design to make a
  foreign key out of.
- **`spell_ingredients.unit` is M9.2's `inventory_unit`**, the same Postgres
  type and not a second copy of it: a tablespoon in a spell is the tablespoon a
  jar is measured in, and M9.5 converts between them. The type keeps its
  `inventory_unit` name — renaming it to suit a second consumer would be a
  `RENAME` under rule 10 for no gain. `quantity` is `numeric(12, 3)`, matching
  `inventory_items.quantityOnHand` exactly, so "do I have enough for this spell"
  loses no precision on the comparison. Both are nullable: a layer may name no
  measurement at all.
- **No `unitDimension` and no dimension CHECK on `spell_ingredients`.** §5 names
  neither on this table, the dimension is derivable through `src/lib/units.ts`,
  and the query that groups stock by dimension has no counterpart here.
- **No index and no CHECK on `spells`**, beyond the primary key's. §5 names
  none, the grimoire's own lookups are M10.9's, and a spell title is not unique
  — two workings may share a name in one coven.
- **No reverse index on `spell_ingredients`.** §5 asks for one on
  `ingredient_categories` ("what is in this category") and asks for none here;
  no v1 feature lists spells by ingredient, so the asymmetry is §5's rather than
  an oversight.

Both tables are inert at Wave 3. Nothing queries them until M10.5's service and
M10.10's mutations land in Wave 13 — the table-task-then-behaviour-task rule,
and the reason the DDL can be constrained now, while the tables are empty.

Every guard above was verified load-bearing rather than assumed, by rebuilding
the shipped migration with each stripped in turn: without the layer index two
ingredients sit at depth 1, without `NOT NULL` an unordered row inserts, with
the key repointed at `inventory_items` a stock-only id is accepted, without the
composite key the same ingredient joins a spell twice, without the default a new
spell's status comes back null, and without `NOT NULL` on `title` a nameless
spell is recorded.

## Expand/contract and the destructive-DDL check (M1.5)

Drizzle generates no down migrations, and hand-writing them is a reliable way
to lose data — so none exist in this repo, and none should ever be added.
The only rollback path for a bad release is a **deploy rollback**: redeploy
the previous app version against the database as it stands. That only works
if every migration leaves the schema compatible with both the app version
that shipped it _and_ the one before it — the expand/contract pattern:

1. **Expand** — a migration that only adds (a column, a table, an index) is
   always safe: old code that doesn't know about the new column simply
   ignores it.
2. **Migrate the app** — ship code that uses the new shape, typically
   alongside the old one for a transition period (dual-write, read-with-fallback).
3. **Contract** — once nothing depends on the old shape any more (usually one
   release later, after the transition period has had a chance to run in
   production), a later migration removes it.

Renaming a column is the canonical case that goes wrong if done directly —
`ALTER TABLE ... RENAME COLUMN` is atomic in Postgres, but it isn't atomic
across a _deploy_: for the seconds-to-minutes it takes Vercel to roll traffic
from the old app version to the new one, both are reading and writing the
same row, and the old version's query for the old column name starts erroring
mid-rollout. Never do it in one step. Instead:

**Worked example: renaming `spells.name` to `spells.title` across two releases**

- **Release N — expand.** A migration adds the new column and backfills it;
  the app writes both and reads with a fallback.

  ```sql
  -- src/db/migrations/00NN_add-spells-title.sql
  ALTER TABLE spells ADD COLUMN title text;
  UPDATE spells SET title = name WHERE title IS NULL;
  ```

  In `src/db/schema` (Drizzle), both columns exist on the table for this
  release:

  ```ts
  export const spells = pgTable('spells', {
    // ...
    name: text('name'), // deprecated — still written, read as a fallback only
    title: text('title'), // canonical as of Release N
    // ...
  });
  ```

  And the write path (inside `withAudit`, in `src/services/`) writes both;
  the read path prefers `title`, falling back to `name` for any row a
  same-release backfill or an in-flight write hasn't caught yet:

  ```ts
  // write
  await tx.update(spells).set({ name: input.title, title: input.title }).where(...);

  // read
  const displayTitle = row.title ?? row.name;
  ```

  This is safe to deploy and, just as importantly, safe to **roll back** —
  the previous app version (Release N-1, which only knows `name`) still
  works fine against this schema, since `name` is still present and still
  kept up to date.

- **Release N+1 — contract.** Once Release N has been running in production
  long enough that nothing reads `name` any more (every row has been
  written under Release N's dual-write, and no older app version is still
  deployed anywhere), a later migration drops it:

  ```sql
  -- src/db/migrations/00MM_drop-spells-name.sql
  ALTER TABLE spells DROP COLUMN name;
  ```

  and the schema/service code drops the fallback and the dual-write, reading
  and writing `title` only. **This migration is destructive** — it needs the
  acknowledgement line below in its PR body, precisely because a same-release
  rollback of Release N+1 back to Release N would otherwise break (Release
  N's dual-write still tries to write `name`, which no longer exists). That
  tradeoff — Release N+1 can no longer safely roll back to Release N, only
  forward-fixed — is exactly what the acknowledgement line is for: a human
  has to say out loud "yes, this is the point where we give up the old
  column," not have it happen silently.

**The CI check (`checks / destructive-ddl` / `scripts/check-destructive-ddl.ts`,
M1.5; a `checks.yml` leg since MB.37)** scans migration files new or changed in
a PR for five forms:

- **any `DROP`** — column, table, type, constraint, index, function, trigger,
  view. Rule 10 says "DROP", and a dropped type or constraint breaks a
  rolled-back release as readily as a dropped column. The two exceptions
  **widen** rather than narrow and pass: `DROP NOT NULL` and `DROP DEFAULT`
  only admit values the old code was already writing. `DROP INDEX` is
  deliberately inside the rule, which means a changed index predicate — Drizzle
  emits `DROP INDEX` + `CREATE INDEX` for one — costs an acknowledgement line
  saying the rebuild is intentional.
- **`RENAME`** (column or table). An index rename is caught too, though it
  cannot break a rollback; Drizzle never emits one.
- **`ALTER COLUMN ... TYPE`**, flagged whenever present — telling narrowing
  apart from widening reliably needs a real SQL parser and the column's
  previous definition, not just regexes over the new migration's text.
- **a `NOT NULL` addition** — `SET NOT NULL`, or `ADD COLUMN ... NOT NULL` with
  no `DEFAULT`.

Comments and string literals are stripped before any rule runs, so a column
comment reading `'never drop this'` is prose rather than DDL. Only `*.sql` is
ever scanned: the `meta/*.json` files Drizzle writes beside each migration are
excluded by the paths filter in `pr-gate.yml` **and** by the script, which
ignores anything else it is handed.

It passes automatically when none of those forms appear. When one does, the PR
body must contain a line of the exact form:

```
Destructive DDL acknowledged: <reason>
```

(case-insensitive, a non-empty reason required) — see the script's own header
comment for the regex and the reasoning. There's no such line format
elsewhere in the repo to stay consistent with; this is the one place it's
defined, so `claude-docs/ci.md` and the script both point back here.

**Locally, `npm run check:destructive-ddl` scans what this branch adds** —
every migration new or changed against its Gitflow base (`origin/staging`, or
`origin/main` for a `hotfix/*` or `release/*` branch), including one
`db:generate` has just written and not yet committed. `--base <ref>` picks
another base. `--all` scans every committed migration instead, which is an
audit rather than a gate: it stays red on `0002_solid_marauders.sql`, whose
`DROP CONSTRAINT` and two `NOT NULL` columns were acknowledged when they
landed. Before MB.37 the bare command _was_ that full scan, so it was
permanently red and told you nothing about your own branch.

## Audit columns and `applyAudit` (M1.15, FKs restored MB.5, split MB.34)

`src/db/audit.ts` exports two column sets, one defined in terms of the other:

- **`auditStampColumns`** — `createdAt`, `createdBy`, `updatedAt`, `updatedBy`.
- **`auditColumns`** — `...auditStampColumns` plus `deletedAt` and `deletedBy`.

Every table spreads `...auditColumns` **except the three join tables**:
`ingredient_categories`, `spell_categories` and `spell_ingredients` spread
`...auditStampColumns` and are hard-deleted (MB.34) — see "Hard delete on the
three join tables" below for why, and note that `workspace_members` and
`ingredient_folk_names` are _not_ in that set. Writing the six columns as the
four plus two rather than listing them twice is what stops the two sets
drifting, and `repository.test.ts` asserts each stamp column is literally the
same builder object in both.

`createdBy`/`updatedBy`/`deletedBy` carry
`.references((): AnyPgColumn => users.id)` per DESIGN.md §5. `audit.ts` and
`schema/users.ts` import each other — `users.ts` spreads `auditColumns`, and
`auditColumns` points back at `users.id`, including for `users`' own rows
(`users.created_by -> users.id`, a genuine self-reference). Drizzle's thunk
defers evaluation past module load, so the runtime cycle is fine; the
explicit `AnyPgColumn` return annotation is what stops TypeScript reporting
"audit.ts circularly references itself" trying to infer it. `src/db/bootstrap.ts`
exports `BOOTSTRAP_USER_ID`, a fixed UUID shared between M1.21's seed and
anything that needs to identify that row — the bootstrap user has no
pre-existing creator, so it inserts itself as its own `created_by`/
`updated_by` in one statement (`INSERT INTO users (id, created_by,
updated_by) VALUES ($1,$1,$1)`), which Postgres accepts because a `FOREIGN
KEY` is checked at statement end, not before the row exists — verified
against a live Postgres by applying MB.5's migration in a rolled-back
transaction and confirming both the self-referencing insert and the
rejection of a nonexistent `created_by` uuid.

`applyAudit(operation, payload, session)` is the pure helper `withAudit`
(M1.16) calls before every write — it takes `'insert' | 'update' |
'delete'`, a payload, and `{ userId }`, and returns the payload with any
audit fields the caller supplied stripped out and replaced with the correct
ones for that operation:

- `insert` sets `createdAt`/`createdBy`/`updatedAt`/`updatedBy` from `session`
- `update` sets only `updatedAt`/`updatedBy`, leaving `createdAt`/`createdBy` absent from the returned payload so the `UPDATE` never touches them — and the `updatedAt` it sets is then overwritten by the database (see "`updated_at` is the database's" below), so the column carries one clock rather than two
- `delete` (soft delete) sets only `deletedAt`/`deletedBy`

Audit ids never come from the caller: `applyAudit` deletes any of the six
audit keys off the incoming payload before setting the ones the operation
calls for, so a payload smuggling `createdBy` from a request body is ignored
in favour of `session.userId`, per CLAUDE.md rule 3.

## `updated_at` is the database's (M1.18)

DESIGN.md §5's second enforcement rule: `updated_at` is stamped by a trigger,
not by application code, so a fix made by hand in `psql` still stamps it and
the audit trail cannot be quietly bypassed.
`0016_updated-at-trigger.sql` adds one PL/pgSQL function —

```sql
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $
BEGIN
	NEW.updated_at := now();
	RETURN NEW;
END;
$;
```

— and attaches it `BEFORE UPDATE ... FOR EACH ROW` to each of the fifteen
tables carrying the four audit stamps. The trigger takes the same name,
`set_updated_at`, on every one: a trigger name is scoped to its table rather
than shared with indexes, so there is nothing for a table prefix to
disambiguate.

- **The assignment is unconditional, and that is the point.** A value the
  statement supplied loses — a hand-written `UPDATE ... SET updated_at = …` is
  precisely what the trigger exists to override — and so does an `UPDATE` that
  changes nothing else, because a statement that touched the row is a touch.
- **`now()`, not `clock_timestamp()`.** It is the transaction timestamp, so
  every row one transaction touches carries the same `updated_at`, and it
  matches the `DEFAULT now()` the column already carries.
- **`BEFORE UPDATE` only.** An insert keeps its own stamps, which is what makes
  `created_at` and `updated_at` equal on a row nobody has edited.
- **Only `updated_at` moves.** The database owns _when_; `updated_by` still
  comes from the session, per CLAUDE.md rule 3. `RETURNING` reads the row the
  trigger already rewrote, so what a caller is handed and what is stored cannot
  disagree.
- **`applyAudit` still puts an `updatedAt` in the `SET` list, and it is
  always overwritten.** Both paths stamp, but only one value is ever stored —
  the database's — so an application whose clock has drifted cannot write a
  timestamp that disagrees with its neighbours.
  `src/db/updated-at-trigger.test.ts` proves it by faking `Date` alone
  (`toFake: ['Date']`, leaving the driver's timers real), running a
  `withAudit` update whose payload says the year 2000, and reading back this
  year.

**Better Auth's three adapter tables are deliberately excluded.** `accounts`,
`sessions` and `verifications` carry an `updated_at` and no `*_by` columns at
all: nothing writes them through `withAudit`, they are not part of the audit
trail, and Better Auth's own `$onUpdate` stamps them (`src/db/schema/auth.ts`).

### A table added later does not get the trigger for free

An event trigger would attach one automatically on `CREATE TABLE`, but
`CREATE EVENT TRIGGER` requires superuser and `sorrel` deliberately is not one
("Migrations and scripts" above). So **a new audited table adds its own
`CREATE OR REPLACE TRIGGER` line in its own migration** — one line, copied.

What makes forgetting that a failing test rather than a review note is
`src/db/updated-at-trigger.test.ts`, the catalogue-introspection guard the
sweep-task rule requires. It applies the whole migration set into the worker's
clone — which tables the sweep reached is the thing under test, so unlike the
per-table schema tests it stubs nothing — and then compares two catalogue
queries: the tables carrying all four audit stamps, and the tables carrying a
`set_updated_at` trigger. A sixteenth audited table reddens it without that
file being edited. The list of fifteen is transcribed there as well, because
two empty sets are equal and something has to say they aren't.

## The write path — `repository.ts` and `withAudit` (M1.16)

`src/db/repository.ts` is the only module that imports `db` from
`connection.ts` (CLAUDE.md rule 2, DESIGN.md §5), and it exports exactly one
write path: `withAudit(session, fn)`. `db` is not re-exported, and `fn` is not
handed the Drizzle transaction — it gets a narrow `AuditWriter` whose three
stamping methods each run their payload through `applyAudit` first. That is what makes
"a write outside `withAudit`" impossible through the public API rather than
merely discouraged: there is no exported handle to write with.

```ts
const [spell] = await withAudit(session, (write) =>
  write.insert(spells, { workspaceId, title: input.title }),
);
```

- **`write.insert(table, values)`** — stamps `createdAt`/`createdBy`/
  `updatedAt`/`updatedBy`, returns the inserted rows.
- **`write.update(table, values, where)`** — stamps `updatedAt`/`updatedBy`
  only; `createdAt`/`createdBy` are never in the `SET` list, so an update
  cannot rewrite who created a row.
- **`write.softDelete(table, where)`** — stamps `deletedAt`/`deletedBy` and
  leaves the row in place (CLAUDE.md rule 4). Typed to demand a `deletedAt`
  column, so it cannot be pointed at a join table with nothing to stamp.
- **`write.delete(table, where)`** — removes the rows outright, for the three
  join tables only (MB.34). Typed to reject any table carrying `deletedAt`, so
  it can never become the way a soft-deletable row is quietly destroyed.

`values` is typed as the table's insert model **minus** the audit columns, so a call site can't even name `createdBy` without a cast — and if
one casts anyway, `applyAudit` strips it: audit ids come from the session,
never from a request body.

Everything inside one `withAudit` call runs in one transaction: if `fn`
throws, the whole transaction rolls back (including writes that already
succeeded before the failing one) and the error propagates to the caller
unchanged. A session with no `userId` is rejected before the transaction
opens, rather than stamping a blank acting user.

The read-side finder builder that applies `deleted_at IS NULL` (M1.20)
deliberately lands on top of this rather than beside it — see "Soft-delete
filtering and the partial-index convention" below.

### `app.current_user_id`, published per transaction (M1.19)

Before it calls `fn`, `withAudit` publishes the session's acting user to
the database itself:

```sql
select set_config('app.current_user_id', $1, true)
```

**Nothing reads this back, and that is expected.** It is published for two
readers that do not exist yet: the v2 history trigger's `changed_by`
(DESIGN.md §13), and the RLS policies MB.29 deferred to the public launch
(DESIGN.md §8). Setting it now is what makes either one a single migration
rather than a re-audit of every write path — so do not remove it on the
grounds that it is unused, and do not describe it as protecting anything
today.

**The second authorization layer is not here.** It is CLAUDE.md rule 5's
branded `Membership` — the value `assertMembership` returns, which every
workspace-scoped finder and `AuditWriter` method demands as its first argument
so the omission is a compile error rather than a missing runtime check. M6.3
builds it. Until then `assertMembership` does not exist either, so treat the
service check as the only layer, and a workspace-scoped query as unguarded
until it takes a proof. The specification for the eventual policies —
the role split they need, `FORCE`, the `security definer` helper, and why a
policy test connected as the table owner proves nothing — is
[`mb.24-rls-role-split.md`](design-decisions/mb.24-rls-role-split.md),
superseded as a plan for v1 and intact as a plan for then.

**Why `set_config(.., true)` and not `SET LOCAL`.** They have identical
semantics — the third argument `is_local => true` _is_ `LOCAL` — but
`SET LOCAL` accepts no bind parameters, so writing it literally would mean
interpolating a user id into SQL text. `set_config` takes the value as a
parameter.

Transaction scoping is the whole point of `LOCAL`: the value is discarded
at `COMMIT` or `ROLLBACK`, so it cannot ride a pooled connection into the
next request that reuses it. `repository.test.ts` asserts this directly —
24 concurrent `withAudit` calls with distinct user ids each see their own,
and a connection outside any `withAudit` transaction sees the setting
unset. Since the GUC is only ever set _inside_ the transaction, and a session
with no `userId` is rejected before the transaction opens, there is no path
that writes with the setting stale or absent.

This is also the reason CLAUDE.md forbids wrapping tests in a rolled-back
transaction: `withAudit`'s `set_config` would be local to that outer
wrapper rather than to its own statement scope, and one test user's identity
would survive into the next assertion — see
[`m1.9-test-db-isolation.md`](design-decisions/m1.9-test-db-isolation.md).

**Testing against a scratch table.** `src/db/repository.test.ts` runs in the
`db` project against this worker's `sorrel_test_<n>` clone, which carries no
application tables until M1.27 — so it creates its own
`repository_probe_herbs` table spreading the real `auditColumns` (minus the
FKs to a `users` table that doesn't exist yet) and drops it afterwards. The
six columns exercised are the ones every real table will carry.

That table carries one extra column no real table will:
`acting_user text default current_setting('app.current_user_id', true)`.
It records what the GUC held _inside_ the transaction that inserted the row,
which is how the M1.19 tests observe a setting the narrow `AuditWriter`
gives them no other way to read — without widening the write API for the
benefit of a test. The `missing_ok` second argument is what makes it null,
rather than an error, when the setting was never set.

## Soft-delete filtering and the partial-index convention (M1.20)

CLAUDE.md rule 4 / DESIGN.md §5: **no exported query can return a soft-deleted
row, and no call site does its own filtering.** `src/db/repository.ts` adds a
private `selectFrom` beside `withAudit` — the one place a read query is
built — and exports exactly three functions on top of it:

- **`findMany(table, where?)`** — every matching row with `deleted_at IS
NULL` ANDed onto whatever `where` the caller supplied — or the caller's
  `where` alone on a table that carries no such column (MB.34). The default,
  and normal-use, finder.
- **`findOne(table, where?)`** — the first row `findMany` returns, or
  `undefined`. There is no separate unfiltered path underneath it.
- **`findManyIncludingSoftDeleted(table, where?)`** — the dedicated escape
  hatch, for admin restore paths only (DESIGN.md §14's trash view / undo). Its
  name says what it does at the call site rather than a `{ includeDeleted }`
  flag a later edit could default the wrong way; nothing else may bypass the
  filter, so a second bypass is a decision argued for in the diff, not a
  convenience appearing quietly beside an import.

`selectFrom` itself is not exported, so there is no public handle a finder
could reach the database through while skipping the filter — the same shape
as `AuditWriter` gives writes no path around `applyAudit`.

**The mechanical guard.** This is a code sweep (CLAUDE.md's sweep-task rule),
so it landed as the mechanism above plus a guard — and since MB.33 the sweep is
divided between two of them, by what each can make impossible.

`src/test/soft-delete-finder-guard.test.ts` covers the inside of the
repository. It reads `repository.ts` as text and asserts: `repository.ts`
builds exactly one `.select(`/`db.query.` call, and it is inside
`selectFrom`; `selectFrom` is not exported, so no caller can reach an
unfiltered read; the repository's exported surface is pinned to
`findMany`/`findOne`/`findManyIncludingSoftDeleted`/`withAudit`, so a fifth
export — a new escape hatch, or a finder that reaches the database some other
way — turns the test red rather than merely going unreviewed; and every
exported finder other than the escape hatch either calls `notSoftDeleted(...)`
directly or delegates to one that does.

A query built _outside_ the repository is the linter's job, not this test's —
see "Where queries may be built" below. It was this test's until MB.33, by
reading every tracked source file as text and looking for `.select(`, which
banned one spelling of a finder rather than the capability: `function findX()`
was caught and `const findX = () =>` was not, the global regex carried its
`lastIndex` between files, the brace matcher broke on a brace inside a string,
and it spawned `git` with a `safe.directory` workaround because CI runs the
container as root over a uid-1000 checkout. At Wave 2 there is exactly one table
(the scratch table in `repository.test.ts`), which is the point: the guard
exists before there is anything to forget, and each later table's finder
adopts the mechanism in that finder's own PR rather than a retrofit pass.

**The partial-index convention.** Every unique index in this schema must
carry `WHERE deleted_at IS NULL`. Without it, a plain `UNIQUE` constraint
still matches a soft-deleted row's value, so deleting a record permanently
reserves its name/slug/whatever the index covers — the exact opposite of
"deleted records stay recoverable but invisible." `users_email_unique`
(`src/db/schema/users.ts`) is the worked example:

```ts
uniqueIndex('users_email_unique')
  .on(table.email)
  .where(sql`${table.deletedAt} is null`);
```

`repository.test.ts` proves the convention rather than merely stating it: a
second scratch table (`repository_probe_charms`) carries a unique index built
exactly this way, and the tests assert a live duplicate name is still
rejected, while soft-deleting the original row and reinserting the same name
succeeds — the row that comes back is a new id, and `findMany` sees only it.

## Hard delete on the three join tables (MB.34)

`ingredient_categories`, `spell_categories` and `spell_ingredients` spread
`...auditStampColumns` rather than `...auditColumns`: four stamp columns, a
composite primary key, and no `deleted_at`. A chip toggled off or an ingredient
pulled out of a spell removes the row.

**Why these three.** They are the highest-churn tables in the schema, and
nothing in v1 reads a deleted join row — there is no restore UI, and the trash
view is v2. Soft-deleting them would cost a tombstone per toggle forever, a
partial unique index on each so the same pair could be re-added, and — the
argument that actually decided it — a `deleted_at IS NULL` that every service
joining _through_ the table has to remember by hand. That last one is the
mistake CLAUDE.md rule 4 exists to prevent, and the one place the repository
cannot prevent it for you: `findMany` filters the table it selects **from**, not
the tables it joins. The v2 history trigger records a `DELETE` as readily as an
`UPDATE`, so history is unaffected.

**What stays.** The four stamp columns: `created_by` on a join row answers "who
added this ingredient to this spell" (story 13). `workspace_members` keeps the
full six — who removed whom, and when, is worth keeping — and so does
`ingredient_folk_names`, which holds content rather than a link.

**What makes it impossible to get wrong.** Two type constraints, both proved by
`@ts-expect-error` lines in `repository.test.ts` (which fail `npm run typecheck`,
not `vitest`, if either constraint is ever loosened):

- `write.delete` takes `PgTable & { deletedAt?: never }` — a table carrying the
  column does not satisfy it, so hard-deleting a soft-deletable table does not
  compile.
- `write.softDelete` takes `PgTable & { deletedAt: AnyPgColumn }` — so it cannot
  be pointed at a join table, where it would emit an `UPDATE` that sets nothing.

`findMany`/`findOne` read both shapes: the private `notSoftDeleted(table)`
returns the predicate when the table has a `deleted_at` and `undefined` when it
does not, and `and()` drops an undefined condition. The decision is made from
the table's own columns, never from an argument a caller supplies, so there is
nothing to pass that would skip the filter where it applies. The third scratch
table in `repository.test.ts` (`repository_probe_pairs`) exercises it: a delete
leaves no row, the same pair can be re-added afterwards with no partial index
to make it possible, and a delete rolls back with the rest of its transaction.

**All three are written.** `ingredient_categories` (M4.4, migration
`0009_amusing_ken_ellis.sql`) is the shape the other two take, and
`ingredient-categories-schema.test.ts` runs the same three assertions against
the real table rather than the scratch pair: `write.delete` removes the row
outright, the pair can be re-added afterwards — by a different member, whose
stamps the new row carries — and an ingredient's other categories are untouched.
`spell_ingredients` (M10.2, migration `0014_cooing_bug.sql`) is the second, and
`spell_categories` (M10.4, migration `0015_wooden_zaran.sql`) the third; each
repeats those three assertions against its own table, so the shape is proved
where it is used rather than once in the abstract.

## `ingredient_categories` (M4.4)

Story 22's table: `ingredientId`, `categoryId`, + the four audit stamps, keyed
on the pair. An ingredient carries several categories and a category holds
several ingredients, which is what makes "both protective and cleansing"
answerable.

- **The composite primary key is the assignment's identity**, as on
  `workspace_members`. There is no surrogate `id`: one would let the same
  category be assigned to the same ingredient twice, with nothing downstream
  able to tell the two rows apart. A duplicate is a `23505` naming
  `ingredient_categories_ingredient_id_category_id_pk`.
- **Both sides are foreign keys** —
  `ingredient_categories_ingredient_id_ingredients_id_fk` and
  `ingredient_categories_category_id_categories_id_fk`. A category is referenced
  by **id**, unlike `ingredients.form`'s free text: there is no vocabulary
  question here at all, since the row _is_ the link and a dangling id on either
  side is a chip that renders nothing.
- **Indexed in both directions.** The primary key's index leads on
  `ingredient_id`, which answers "what is this ingredient tagged with";
  `ingredient_categories_category_id_idx` leads on `category_id` for "what is in
  this category", which would otherwise scan every assignment in the database.
  `ingredient_id` rides along on the second so that question is answerable from
  the index alone, mirroring what the key already does for the first. It is not
  unique — uniqueness is the primary key's job, and a unique index here would
  refuse a category its second ingredient.
- **No partial index, because there is no tombstone to dodge.** The
  partial-index convention above exists so a soft-deleted row cannot reserve its
  name forever; this table hard-deletes, so the pair is either there or it is
  not, and `WHERE deleted_at IS NULL` would not even compile against its
  columns.

The table is inert at Wave 3 — nothing queries it until Wave 8, where M4.8's
`categoriesByIngredient` loader is its first reader — which is CLAUDE.md's
table-task-then-behaviour-task rule working as intended. §12's
assigned-versus-derived distinction reads it from the derived side: a spell's
derived categories are the union of what this table holds for its ingredients.

## `spell_categories` (M10.4)

Story 48's table: `spellId`, `categoryId`, + the four audit stamps, keyed on the
pair. `src/db/schema/spell-categories.ts`, migration `0015_wooden_zaran.sql`,
and the last of MB.34's three join tables.

**It holds the _assigned_ categories, and only those.** §9 and §12 make the
distinction and call conflating the two a bug: this table is what a member
declares the working is _for_, while a spell's **derived** categories are the
union of its ingredients' — read through `ingredient_categories` and stored
nowhere. M10.7 and M10.8 compare them, M10.17 renders the comparison, and that
comparison is the whole reason a stored intent is worth having rather than
inferable from contents. Nothing in the schema enforces the distinction, because
nothing can: the two are the same pair of columns pointing at the same
`categories` rows, and the difference is which table they came from.

- **The composite primary key is the assignment's identity**, as on the other
  two join tables. No surrogate `id`: one would let the same category be
  assigned to the same spell twice, with nothing downstream able to tell the
  rows apart. A duplicate is a `23505` naming
  `spell_categories_spell_id_category_id_pk`, whoever adds it — the pair is the
  identity and the stamps are only who touched it, so a second member toggling
  the same chip on is the same row.
- **Both sides are foreign keys** — `spell_categories_spell_id_spells_id_fk` and
  `spell_categories_category_id_categories_id_fk`. `categories` is referenced by
  **id**, unlike the free text `spells` uses for moon phase and wax colour:
  §5's rule is that a vocabulary a member writes is text and one only an admin
  writes is a foreign key, and here there is no vocabulary question at all,
  since the row _is_ the link. The test proves which table each key names rather
  than asserting it twice — a real category id in the spell column is refused,
  and so is a real spell id in the category column, each naming its own
  constraint. Repoint either key and that pair is what reddens.
- **Indexed in both directions.** The primary key's index leads on `spell_id`
  ("what is this spell tagged for"); `spell_categories_category_id_idx` leads on
  `category_id` for "which spells are tagged for prosperity", with `spell_id`
  riding along so the question is answerable from the index alone. It is not
  unique — that is the primary key's job, and a unique index here would refuse a
  category its second spell.
- **The reverse index has a named v1 reader, which is why it exists here and not
  on `spell_ingredients`.** M10.11's grimoire list is filterable by category, so
  the category-to-spell direction is a real query; no v1 feature lists spells by
  ingredient, so M10.2 adds no reverse index. §5 spells the index out for
  `ingredient_categories` and is silent for this table — M10.4's acceptance
  criteria ("indexed both ways") and M10.11's filter are what settle it, and §5
  now says so rather than leaving the silence to be read as a refusal.
- **No partial index, because there is no tombstone to dodge**, and no CHECK
  constraints: §5 names none, and between the key and the two foreign keys there
  is nothing about an assignment left to constrain.
- **No `workspace_id`.** §5 names none, and a spell's workspace is the spell's.
  That is also why this table cannot self-scope under CLAUDE.md rule 5 — §14
  names it explicitly, alongside `spell_ingredients`: the service loads the
  parent spell under the `Membership` proof and derives scope from it, so a
  guard that infers the workspace-scoped set from a column name would silently
  exempt both tables.

**`NOT NULL` on the pair is redundant with the key, and kept anyway.** Both
columns are declared `.notNull()`, matching the other two join tables, and
Postgres 18 does record each as its own named constraint
(`spell_categories_spell_id_not_null`) — but a primary key column is implicitly
non-null regardless, so stripping the declaration leaves an insert omitting
`spell_id` refused with the same `23502`. It stays because it says what the
column means and matches its siblings; the schema test asserts the shipped
behaviour and names which constraint actually produces it, so the next reader
does not mistake a redundant declaration for a load-bearing one.

Every other guard above _was_ verified load-bearing rather than assumed, by
rebuilding the shipped migration with each stripped in turn: without the
composite key the same category is assigned to one spell twice, without the
reverse index the catalogue shows no non-unique index at all, and with the spell
key repointed at `categories` a live category id is accepted as a spell.

The table is inert at Wave 3 — nothing queries it until Wave 13, where M10.5's
service and M10.9's queries are its first readers, which is the
table-task-then-behaviour-task rule and the reason the DDL can be constrained
now, while the table is empty.

## Who may import the client (M1.17)

CLAUDE.md rule 2 — only `src/db/repository.ts` may import `db` — is enforced
by a `no-restricted-imports` entry in `.oxlintrc.json`. It bans every
relative shape `connection.ts` can be reached by (`./connection`,
`**/db/connection`, with or without the `.ts`), type-only imports included,
so a new importer fails `npm run lint` and the pr-gate lint job.

Exemptions are `// oxlint-disable-next-line no-restricted-imports` comments on
the import itself, not config: oxlint 1.82 **ignores** a rule set to `"off"`
or `"allow"` inside an `overrides` block, so a per-file exemption there would
look like it worked and silently do nothing. Four files carry one:

| File                                     | Why it needs a client, not a writer                                                                                                                                                                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/db/repository.ts`                   | The choke point itself — the rule exists to protect it.                                                                                                                                                                                                         |
| `src/lib/auth.ts`                        | Better Auth's `drizzleAdapter(db, …)` takes the Drizzle client. It runs its own inserts through its adapter and database hooks (`claude-docs/auth.md`), so there is no session to hand `withAudit`; the user-create hook stamps `createdBy`/`updatedBy` itself. |
| `scripts/db-seed.ts`                     | The seed CLI constructs the handle it passes to `seed(db, …)`, which writes as the bootstrap user rather than through a session.                                                                                                                                |
| `src/db/test-database-isolation.test.ts` | The connection _is_ the subject: it asserts `db` points at this worker's `sorrel_test_<n>` clone (M1.9).                                                                                                                                                        |

That list is pinned by `src/test/lint-db-client-boundary.test.ts`, which lints
deliberate violations written to a temp directory and asserts the exemption
set is exactly those four. Adding a fifth turns that test red, so it has to be
argued for in the diff rather than appearing quietly beside an import. The
violations are written at test time rather than committed as fixtures because
oxlint skips anything matching the config's `ignorePatterns` even when the
path is passed explicitly — `--no-ignore` does not override it — so a
committed fixture would have to be lintable by `npm run lint`, and would then
fail the very check it exists to prove.

## Where queries may be built (MB.33)

CLAUDE.md rule 4's other half — a SELECT built anywhere but the repository —
is enforced by a second `no-restricted-imports` group in the same config
entry, banning `drizzle-orm` and `drizzle-orm/*`. A Drizzle query cannot be
built without importing the query builder at runtime, so banning the import
bans the capability: `src/services`, `src/graphql`, `src/app`,
`src/components`, `src/lib` and `e2e` fail `npm run lint` on a runtime
import, whatever the resulting finder is named or declared as.

`allowTypeImports` keeps `import type` legal everywhere, which is the point
rather than a concession: a type import is erased at compile time and can
build nothing, and it is how DESIGN.md §7's "the GraphQL layer imports
`drizzle-orm` for _types_ only" is now stated in the toolchain instead of only
in prose.

The database layer is exempted by an `overrides` block matching
`src/db/**/*.ts`, `scripts/**/*.ts` and `drizzle.config.ts`. Two oxlint 1.82
behaviours shape it, and both are load-bearing:

- A rule set to `"off"` or `"allow"` inside `overrides` is **ignored**, so the
  exemption cannot be written as a disable. It is a narrower copy of the rule —
  the client group alone, without the query-builder group.
- An `overrides` block **replaces** the top-level rule config for the files it
  matches rather than merging with it. That is why the copy restates the client
  group verbatim: drop it and the whole database layer would silently lose rule
  2 as the price of being allowed to build queries.

That second failure mode is the one a green test suite would otherwise hide, so
`lint-db-client-boundary.test.ts` asserts it directly — a probe importing the
client from inside `src/db` must still draw a diagnostic. The same test covers
both rules in one oxlint run: every probe is written, linted in a single spawn,
and the cases partition the diagnostics by filename. The probes live in
throwaway `__lint-probe__/` directories inside the repo (gitignored, removed in
`afterAll`) rather than in `tmpdir`, because both rules are scoped by path and
a file outside the tree matches no `overrides` block — it could only ever prove
the default tier.

**What each rule makes impossible, rather than merely absent:**

| Rule                            | Impossible                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Client ban (M1.17)              | Reaching `db` — and so a transaction, or an unaudited write — outside `repository.ts` and the four exempt files. |
| Query-builder ban (MB.33)       | Building any query at all outside the database layer, including one that would skip `deleted_at IS NULL`.        |
| `selectFrom` unexported (M1.20) | Reaching an unfiltered read from inside the repository.                                                          |

M3.9 adds the next one: a rule stopping `src/graphql/**` and
`src/app/**` from importing the _repository_, so those layers reach a service
and nothing below.

## Snapshot before production migrations, and the restore runbook (M1.6)

Expand/contract keeps a bad _release_ recoverable by rolling the app back.
It says nothing about a migration that runs cleanly but corrupts or loses
data outright (a backfill with a wrong predicate, an errant `UPDATE`) — the
app rollback in that case just points working code at a damaged database.
The snapshot exists for that failure mode.

**What happens automatically.** `migrate.yml` (M1.4), immediately before it
applies pending migrations against `main`, branches the current
`main` Neon branch as `snapshot-<short sha>` — the seven-character
short SHA of the commit whose migrations are about to run, so the branch
name identifies exactly the change it precedes. Preview (`staging`, hotfix)
migrations never snapshot; those databases are already disposable per
[`m1.1-neon-branch-strategy.md`](design-decisions/m1.1-neon-branch-strategy.md).
The step is guarded on `NEON_API_KEY`/`NEON_PROJECT_ID` the same
stub-now/wire-later way `deploy.yml` guards on the Vercel secrets. M0.27
wrote the secrets matrix (`claude-docs/secrets.md`), but these two rows are
still unset — MB.12 owns setting them — so until then the step warns and
skips rather than failing the job.

A weekly scheduled workflow, `neon-snapshot-prune.yml`, keeps the newest
`KEEP_SNAPSHOTS` (3) `snapshot-*` branches and deletes the rest — Neon's free
tier caps a project at 10 branches total, shared with `main`,
`staging`, and one ephemeral branch per open hotfix preview, so snapshots
can't be left to accumulate.

**Promotion (the restore procedure).** Deciding to promote a snapshot is a
production-incident call, made by a human operator with deploy access — never
automatic, and never made by CI. The steps:

1. Identify the bad commit and its snapshot branch, `snapshot-<short sha>`.
2. In the Neon console, create a compute endpoint on that snapshot branch
   (a branch has no connection string until an endpoint exists on it) and
   copy its connection string.
3. Set that connection string as the `production`-scoped `DATABASE_URL`
   Vercel environment variable, overwriting the current value (dashboard, or
   `vercel env rm DATABASE_URL production` then `vercel env add DATABASE_URL
production`).
4. Redeploy production (push to `main`, or `vercel deploy --prebuilt --prod`
   directly) so the running app picks up the new `DATABASE_URL`.
5. Leave the old, now-corrupted `main` branch in place under a
   renamed, obviously-incident label (e.g. `production-incident-<date>`) for
   forensics — don't delete it as part of the recovery itself.
6. Rename the promoted branch to `main` once the incident is
   confirmed resolved, so the next `migrate.yml` run's "find the branch
   named `main`" lookup keeps working, and so `staging`'s Neon
   parentage (a child of `main`, per M1.1) still points at the branch
   that's actually live.

**The data-loss window is real and unavoidable**: every write `main`
accepted between the snapshot's creation (the start of that `migrate.yml`
run) and the moment the redeployed app in step 4 starts using the promoted
branch is gone — the snapshot is a point-in-time branch, not a replica that
keeps catching up. That window is normally seconds to a few minutes (however
long the migration + promotion takes), not the time since the last release.

**Restore drill.** This procedure must be rehearsed once against `staging`
before it's trusted for a real `production` incident — a runbook nobody has
followed is a guess, not a plan. Drill it by: taking a snapshot branch of
`staging` (the same API call `migrate.yml` makes, with `staging` as the
parent instead of `main`), promoting it per the steps above, and
confirming the app comes back up reading the promoted branch. Record the
result here — date, who ran it, what (if anything) didn't match the written
steps.

_Not yet drilled as of this record._
