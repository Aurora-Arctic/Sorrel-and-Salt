# Database — summary

`src/db/connection.ts` is the only place the Postgres driver is instantiated.
It exports `db`, a Drizzle client, built with `drizzle-orm/postgres-js` over
the `postgres` package (pure JS, no native binary). `db` reads `DATABASE_URL`
from the environment at module load and throws if it is unset — no default,
no silent fallback.

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

- **`npm run db:generate`** is `drizzle-kit generate` — diffs `src/modules/*/schema`
  against `src/db/migrations` and writes a new migration for any change. The
  first migration (`0000_enable-extensions.sql`) was written by hand with
  `drizzle-kit generate --custom`, since enabling an extension isn't
  something schema-diffing can express; `0001_lucky_centennial.sql` (M2.2) is
  the first one it actually generated, from `users.ts` and `auth.ts` (now `src/modules/identity/schema/`)
  — see `claude-docs/auth.md`.
- **`npm run db:migrate`** is `drizzle-kit migrate` — applies every migration
  under `src/db/migrations` not yet recorded in the `drizzle` schema's
  `__drizzle_migrations` table it creates on first run. That table is what
  makes re-running idempotent: a migration already recorded is skipped, not
  reapplied.
- **A failed migration names its cause, since MB.49.** `drizzle-kit migrate`
  catches whatever the driver throws and exits 1 without printing it, so a
  failure against staging once read in full:

  ```
  Using 'postgres' driver for database querying
  [⣟] applying migrations...
  ##[error]Process completed with exit code 1.
  ```

  An unreachable host, a wrong password, an `sslmode` mismatch and a
  `channel_binding` parameter all produce that byte-identical output — the
  shape carries no information at all. `migrate.yml` therefore runs
  `scripts/probe-database.ts` first, which opens the connection itself and
  prints the driver's error code and message (`ECONNREFUSED`, `ENOTFOUND`,
  `28P01`, `3D000`, `42704`) before drizzle-kit can swallow it. Locally the
  same script is the fastest way to tell a bad URL from a stopped container:
  `node scripts/probe-database.ts --file <a dotenv file holding DATABASE_URL>`.
  `claude-docs/ci.md` carries the CI wiring.

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
- **`0017_custom-spell-ingredients.sql`** (MB.40) reshapes `spell_ingredients`
  so a layer may be a custom, one-off ingredient — see "Custom ingredients"
  under the grimoire. `drizzle-kit generate` wrote the statements and the file
  was reordered by hand, expand first (two columns, two partial unique indexes,
  four checks) and contract last (the `(spell_id, ingredient_id)` primary key
  replaced by `(spell_id, layer_order)`, `ingredient_id` made nullable, the old
  layer index dropped as redundant), so every guarantee is held by its
  replacement before the thing that used to hold it goes. It is the first
  migration here to carry rule 10's destructive-DDL acknowledgement, for the
  `DROP CONSTRAINT` and the `DROP INDEX`; `DROP NOT NULL` widens and is exempt.
  A contract migration was affordable because the table was empty and
  unqueried — the table-task-then-behaviour-task rule paying out.
- **`0026_unaccent.sql`** (M8.5) is the fourth hand-written one, via
  `generate --custom`: `CREATE EXTENSION IF NOT EXISTS unaccent`, for the
  compendium search's accent folding, and `unaccent_immutable(text)`, a
  SQL-language wrapper declared `IMMUTABLE` because it names the dictionary —
  `unaccent()` itself is `STABLE`, since which dictionary it reads depends on
  `search_path`, and an expression index takes an immutable function only.
  `IF NOT EXISTS` for 0000's reason: `sorrel_template`/`sorrel` have the
  extension from the image build (`Docker/postgres-init/`), and the migration
  is what makes a from-scratch database match. A trusted extension, so
  `sorrel`, no superuser, and a Neon role may create it; `LANGUAGE sql`
  because a C-language wrapper would need superuser.
- **`0027_unaccent-indexes.sql`** (M8.5) adds `ingredients_unaccent_trgm` and
  `ingredient_folk_names_unaccent_trgm`, `gin_trgm_ops` over
  `unaccent_immutable(…)` of the searched columns — beside the raw trigram
  indexes rather than in their place, since the fuzzy finders still match the
  raw columns. `drizzle-kit generate` wrote the statements; `IF NOT EXISTS`
  was added by hand, as 0011's was. See "The compendium read".
- **Migration files are committed**, not generated at deploy/build time —
  `src/db/migrations/**` is real source, reviewed like any other change.
- **`npm run db:seed`** runs `scripts/db-seed.ts`, which calls
  `seed(db, { scenario })` from `src/db/seed/index.ts` and then
  closes the pool `connection.ts` opened, or the process never exits.
  All three scenarios are implemented (M1.21, M1.22, M1.23 — "The seed
  module", "The standard scenario" and "The demo scenario" below) and all
  three are reachable from the CLI as of M1.24: **`SEED_SCENARIO`** picks one,
  defaulting to `minimal`. The script runs
  through **`tsx`**, alone among the scripts: bare Node's type stripping
  resolves no extensionless relative import, and the seed is the first thing
  under `src/` a script executes that has one.
- **`resolveScenario` (M1.24) refuses an unrecognised name rather than falling
  back to `minimal`.** Both readers of `SEED_SCENARIO` — the CLI and the
  `db-init` compose service through it — go through that one parse, so they
  cannot disagree about what `demo` means. A silent fallback would hand
  someone who mistyped `demo` one admin and one user, and they would then
  debug the app rather than the variable. Unset or blank is still `minimal`.
- **`npm run db:drop` and `npm run db:reset`** (M1.24). `db:drop` calls
  `dropSchema` from `src/db/seed/reset.ts`; `db:reset` is `db:drop &&
db:migrate && db:seed`, and that first step is what makes it a reset rather
  than a re-run. `dropSchema` drops **two** schemas inside one transaction:
  `public` (the tables, the enums, `set_updated_at()`, `pg_trgm`) and
  `drizzle` (drizzle-kit's `__drizzle_migrations` journal). Leaving the
  journal is the trap — `db:migrate` reads every migration as already applied,
  does nothing, and the seed then fails on tables that are gone. It recreates
  an empty `public` for migration `0000_enable-extensions` to put `pg_trgm`
  back into, which is why the reset is drop _then_ migrate and never a drop
  alone. A `SET LOCAL client_min_messages = warning` rides at the head of the
  transaction: `DROP ... CASCADE` emits a NOTICE per dependent object, around
  thirty of them by Wave 4, each rendered by postgres-js as a multi-line
  object that reads like a stack trace. Schemas the app does not own are left
  alone. `drop` is the one destructive verb in the CLI and refuses to run
  under `NODE_ENV=production`; nothing in `deploy.yml` or `migrate.yml` calls
  it, so the accident worth refusing is a production `DATABASE_URL` in a shell
  that also has this script.
- **`Docker/postgres-init/enable-extensions.sql`** also creates the `sorrel`
  role and database now, not just `pg_trgm`. Without it, a container built
  from `Dockerfile.postgres` would never get a `sorrel` role/database at
  all: `PGDATA` is already populated at image build time, so the entrypoint's
  usual first-boot "create `POSTGRES_USER`/`POSTGRES_DB` from env" step never
  runs for it. Still no schema or seed data: `db-init` applies both to
  `sorrel` at container start (M1.24), and the test harness applies them to
  its own clones of `sorrel_template` at test-run setup (M1.27) — nothing is
  baked in.
- **`sorrel` holds `CREATEDB` and owns `sorrel_template`** (M1.9), granted in
  the same init script. `postgres`'s own password is generated and discarded
  within that build step (`Dockerfile.postgres`), so `sorrel` is the only
  role any runtime connection can ever authenticate as — and cloning a
  database as a template requires either owning it or being a superuser.
  This is what lets the test harness (`tests/support/seeded-database.ts`)
  run `CREATE DATABASE sorrel_test_template TEMPLATE sorrel_template` as
  `sorrel`, migrate and seed that, and clone `sorrel_test_<n>` and
  `sorrel_e2e` from it. See `testing.md`.
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

`src/modules/coven/schema/workspaces.ts` holds DESIGN.md §5's two workspace tables and
the `workspace_role` enum (`viewer`, `member`, `owner`). The declaration
order reads as a hierarchy and is not one: M6.3 gives each role its own
permission statements, so nothing compares two roles (see "The Membership
proof" below).
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

`src/modules/coven/schema/workspace-invitations.ts` holds DESIGN.md §5's third workspace
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
`src/modules/ingredients/schema/ingredients.ts`, migration `0005_uneven_bloodstorm.sql`; M4.1a
adds its three partial unique indexes — **merged**, same schema file, migration
`0006_wandering_mockingbird.sql`; M4.2a creates `ingredient_forms` —
**merged**, `src/modules/vocabulary/schema/ingredient-forms.ts`, migration
`0008_unknown_lyja.sql`; and M4.4a creates `ingredient_folk_names` —
**merged**, `src/modules/ingredients/schema/ingredient-folk-names.ts`, migration
`0010_broken_shiver_man.sql`. MB.28
recorded the model here first, ahead of that DDL, so M4.1 was transcription
rather than design — the same reasoning as CLAUDE.md's table-then-behaviour
rule, one step earlier: cheapest to get right before anything depends on it.
What follows describes all three as built.

- **`ingredients`** — `id`, `workspaceId` (nullable: `NULL` is the compendium
  tier, non-null is a workspace's own ingredient), `name`, `slug` (MB.81;
  "Ingredient slugs" below), `canonicalName`, `nomenclature`, `form`, the generated `canonicalKey`, the correspondence
  columns (`description`, `element`, `planet`, `zodiac`, `deities[]`, `color`,
  `safetyNotes`, `substitutes[]`), + audit. `name` is the display label —
  what it's called here — and stays freely relabellable, because identity
  moved off it onto `canonicalName`/`nomenclature`/`form`. Of the
  correspondences only `element` is constrained: an `ingredient_element`
  `pgEnum` of `earth`, `air`, `fire`, `water`, `spirit`, closed and fixed —
  the exact opposite of `form`, and the reason the two are easy to confuse
  but never interchangeable. `deities` and `substitutes` are native
  `text[]` columns, one of the things SQLite could not have run (DESIGN.md
  §14). Seven declared indexes: M4.1a's three partial unique ones (below),
  MB.81's two on the slug ("Ingredient slugs" below), `ingredients_trgm`
  (M4.6), one multicolumn `gin_trgm_ops` index over `name` and
  `canonical_name` — see "Fuzzy matching" below — and its folded twin
  `ingredients_unaccent_trgm` ("The compendium read"). The database holds two
  more until MB.107, MB.81's undeclared pending-claim indexes.
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

**How the table is tested.** The worker's `sorrel_test_<n>` clone arrives
with every migration applied and the `standard` scenario seeded, re-cloned
that way before each test file (M1.27, `testing.md`), so
`tests/modules/ingredients/schema/ingredients-schema.test.ts` asserts against the real table as
production's migrations built it: no DDL is applied or hand-copied in the
test, and nothing is dropped afterwards. Its `beforeEach` is `truncate
ingredients cascade` — the seeded compendium has category and folk-name
links behind `NO ACTION` foreign keys, so a `delete` would be refused — and
its author and workspace are the seed's (`FIXTURE_USERS.A`, workspace W).
Until M1.27 the template was empty, and the file applied the one migration
that creates `ingredients` while stubbing `users`/`workspaces` to a bare
`id`; that is also why one of its tests met
`ingredients_workspace_identity_unique` for the first time when the full
schema arrived, and now gives its five rows five identities. The shape half
of the file needs no database at all and reads `getTableConfig`, the same as
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
entries) as long as they're different identities; the formal name that keeps
them apart is in the slug too ("Ingredient slugs" below). They're indexes rather
than unique constraints because Drizzle's `nullsNotDistinct()` exists only
on constraints, and a constraint can't carry a `WHERE` predicate at all —
since every unique index in this schema must be partial, the constraint form
was never on the table regardless. Two indexes over the two tiers rather than
one over `(workspace_id, canonical_key)` for the same reason: without
`NULLS NOT DISTINCT`, every compendium row's null `workspace_id` would be
distinct from every other's and the single index would reserve nothing there.

**The predicates are asserted from the catalogue, not just the behaviour**
(`tests/modules/ingredients/schema/ingredients-indexes.test.ts`, which applies `0005` and `0006` into
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
until the table is big.

**The threshold is set by `selectFrom`, not by its callers.** A finder asks
for a similarity read by handing `selectFrom` a `Similarity` — an `orderBy`
and a `limit` — in place of a `Keyset`, and `selectFrom` then opens a
transaction, runs `select set_config('pg_trgm.similarity_threshold', '0.4',
true), set_config('pg_trgm.word_similarity_threshold', '0.6', true)` in it,
and runs the read in the same transaction. `set_config(…, true)` is
`SET LOCAL` taking a bind parameter, as `withAudit`'s GUC is. So a finder
cannot forget either threshold, and each is written in one place. The second
is `<%`'s, word similarity, which is how a description is searched ("The
member's autofill" below); 0.6 is pg_trgm's own default, set anyway so the
server's configuration cannot move it. A keyset page can ask the same way.
A `Keyset` marked `wordMatch` is read in a transaction that first sets the
word threshold to the search's 0.5 ("The compendium read"). One marked
`similarityMatch` first sets the similarity threshold to the same 0.4
constant, which is how `findSimilarIngredients` pages (below). These are the
reads that open a transaction: they carry a planner setting, not an identity,
so they are not the read-side `withAudit` that MB.29 declined to build.

**`findSimilarIngredients` (M4.7) is the first finder bound by both halves.**
It answers story 16's "did you mean": live ingredients in the compendium or
the proof's workspace whose display name, formal name or a live folk name is
`%`-similar to the name, best first by the greatest of the three
similarities. It reads one keyset page at a time, keyed `[-score, name]` and
marked `similarityMatch`, and carries each row's score, because
`possibleDuplicates` (MB.11) pages it through the helper
(claude-docs/graphql.md, "`possibleDuplicates`"). Each row
carries `canonical_name`, which is what tells five Cat's Claws apart. The
three matches are a `UNION ALL` under `id IN (…)`, and each detail is
load-bearing:

- **Not an `OR` beside the scope.** Postgres cannot turn a subquery inside an
  `OR` into a join, so `name % $1 OR … OR id IN (folk-name subquery)` tests
  the subquery per row and walks `ingredients` whole.
- **`UNION ALL`, not `UNION`.** `IN` removes duplicates already, and
  `UNION`'s own de-duplication wants sorted input, which the planner gets
  cheapest by walking `ingredients_pkey` in full — an index scan that reads
  every row.

`findPossibleDuplicates` in `ingredients` is the service over it, and asks
`ingredient: ['read']`: every row it can return is one a reader of that
workspace could already list.

**Its `EXPLAIN` test needs more rows than M4.6's.** `duplicates-plan.test.ts`
captures the SQL the service actually sends, by rebuilding the connection with
a logger, and plans it with `enable_seqscan = off`. That is not enough on its
own. The folk-name arm filters `deleted_at IS NULL`, which is exactly
`ingredient_folk_names_unique`'s partial predicate, so that index offers a
whole-table walk the planner prefers to a GIN probe below about 20,000 folk
names. The test seeds 30,000 folk names with distinct (md5) trigrams, so the
plan shows a real choice between the probe and the walk. With 2,000 names
sharing one prefix, the plan shows the walk even for a query that can reach
the trigram index.

**Accent insensitivity is the compendium search's, through `unaccent`** (M8.5;
"The compendium read" below). It is not the fuzzy matches': `%` reads the raw
columns and the raw trigram indexes, and one diacritic barely moves a trigram
score, so the duplicate warning is accent-tolerant without folding. Folding it
too would be a small task of its own, not a gap.

Full column list, the CHECK constraints' exact text, and the
local-beats-compendium resolution query that reads these indexes: DESIGN.md
§5.

### Ingredient slugs (MB.80; table MB.81, rule MB.82)

Every ingredient carries a URL slug, and a compendium entry's is its public
address, `/compendium/ingredients/[slug]`. MB.81 landed the columns, the
indexes and the retirements table, and MB.82 the rule on top. The argument is
[`mb.80-public-compendium.md`](design-decisions/mb.80-public-compendium.md),
superseded in part by
[`mb.82-slug-takeover.md`](design-decisions/mb.82-slug-takeover.md); what
follows is what exists.

- **`slug` is the label, the form and the formal name, always.**
  `ingredientSlug(name, form, canonicalName)` in `src/lib/slugify.ts` is
  `slugify` of the three joined by spaces, an undeclared part left out:
  `Cat's Claw` / `bark` / _Uncaria tomentosa_ is
  `cats-claw-bark-uncaria-tomentosa`; graveyard dirt, which declares no formal
  name, is `graveyard-dirt-earth`. Every declared part goes in for every entry
  rather than only on a clash, so an address never depends on which entry was
  added first. The column is
  `NOT NULL` with **no default** — a default would be a second slug rule,
  written in SQL — so whoever writes a row derives it, the seed and the test
  fixtures included (`ingredientColumns` derives it the same way).
- **Two partial unique indexes.** The address is unique per tier among live
  rows — `ingredients_compendium_slug_unique` on `(slug)` where
  `workspace_id IS NULL AND deleted_at IS NULL`, and
  `ingredients_workspace_slug_unique` on `(workspace_id, slug)` where
  `deleted_at IS NULL`. The workspace index carries no tier predicate, as
  DESIGN.md §5 writes it: a null `workspace_id` collides with nothing in a
  btree, so compendium rows pass through it unconstrained. Soft-deleting an
  entry releases its slug, as every partial index here releases what it
  reserved.
- **MB.81's pending claims are gone.** `pending_slug`,
  `pending_slug_effective_at` and their two partial unique indexes held the
  claim a relabel made when its slug was reserved. MB.82 dropped the
  reservation and the schema's declarations, and MB.107's
  `0028_drop-pending-slugs.sql` dropped the four from the database once that
  had deployed: a column drop is two PRs ("Expand/contract").
- **Two entries may share a label and a form; the formal name tells them
  apart, in the slug as in the identity key.** The `standard` seed's two
  _Cat's Claw_ barks, _Uncaria tomentosa_ and _U. guianensis_, are
  `cats-claw-bark-uncaria-tomentosa` and `cats-claw-bark-uncaria-guianensis`.
  What the slug index still refuses is the pair `slugify` folds together and
  `canonical_key` does not — two formal names differing only in punctuation or
  accents (`Lavandula angustifolia 'Hidcote'` beside
  `Lavandula angustifolia Hidcote`), or words shifting between the label and
  the formal name — and the answer there is to distinguish the formal name.
  Because the formal name is in the address, changing it recomputes the slug
  exactly as a relabel does (MB.82).
- **`retired_ingredient_slugs`** — `id`, `ingredientId` (FK), `workspaceId`
  (nullable FK, the ingredient's own scope mirrored, so a retirement is per
  tier as the slug is), `slug`, `retiredAt` (`DEFAULT now()`), the generated
  `expiresAt`, + audit, with its `set_updated_at` trigger. One plain btree
  index on `slug`, **not unique**: a slug may be retired more than once over
  the years, by one entry or several, and the redirect is a predicate on
  `expires_at`, not a row's uniqueness. Only the compendium writes one.
- **`expires_at` is `date_trunc('day', retired_at) + interval '180 days'`**,
  generated and stored: midnight of the retirement's UTC calendar date, plus
  180 calendar days, so the window closes at the same instant for every slug
  retired that day whatever the hour of the rename, and nothing has to run at
  that instant — the redirect ends by a date comparison.
  It is legal as a stored generated column only because the column is
  `timestamp`: `date_trunc(text, timestamp)` and `timestamp + interval` are
  IMMUTABLE, where both are STABLE on `timestamptz`.

**The rule (MB.82).** The slug follows the label, the form and the formal
name: both services recompute it on every update, not only on create.

- **A compendium entry's old slug is retired as the admin's.**
  `updateCompendiumEntry` reads the row first, for the slug it holds, and
  when the new one differs it writes a retirement in the same transaction,
  `retired_at` the write's own instant. Two admins saving one entry at the
  same instant can retire the older slug rather than the one the other just
  wrote; with only admins writing the compendium, that is accepted rather
  than locked.
- **A retired slug redirects while its window is open and nobody holds it.**
  `findCompendiumSlugRedirect(slug, at, excluding?)` answers the live entry
  that moved off `slug` most recently, at its current slug, while
  `expires_at` is after `at` and no live compendium entry holds `slug` —
  an entry at the address is what the address answers. The entry is joined
  through `existsIn`, so a soft-deleted one answers nothing. `excluding`
  leaves one entry out on both sides, as the one that moved and as the one
  holding the slug.
- **`resolveCompendiumSlug(slug)` is the public route's one read,** taking no
  session: the live entry at `slug` (`findCompendiumEntryBySlug`), with
  `movedAway` naming an entry whose redirect from it would still be running
  but for this one, else `{ kind: 'moved', slug }` for a 308 to the current
  slug, else `NotFound` — a coven's slug included, since a coven entry's
  existence is private.
- **Taking a slug another entry redirects from asks first.** A create or a
  rename whose slug such a redirect runs from is refused as a
  `ValidationError` on `endRedirect`, naming the entry and the instant its
  window closes, unless the input carries `endRedirect: true`. The check is
  read before the write, as the collision naming is after it; two admins
  saving at once can both pass it. Confirmed, the write takes the slug, and
  the retirement stays, so the page at the address can link to the entry
  that moved. An entry taking back its own old slug is left out of the check
  and needs no confirmation.
- **A slug collision names the entry holding the address**, looked up by
  `findCompendiumEntryBySlug` after the write rolled back: the pair
  `slugify` folds together is not always visible in either input.
- **Lapsed retirements are hard-deleted on the next compendium write**, by
  `write.deleteLapsedSlugRetirements(admin, at)` inside it — the writer's one
  hard delete of a table carrying `deleted_at`, named for it as the
  provisional-account delete is, since `delete` is typed to refuse such a
  table. A redirect that has ended answers nothing, so there is nothing to
  tombstone.
- **Every instant is the caller's clock,** `new Date()` in the service, passed
  down rather than read from `now()`, so a test pins the window exactly and a
  retirement's `retired_at` is the same instant the check compared against.
- **A coven ingredient's slug retires nothing.** No route reads it — the
  in-app page is `/ingredients/[id]` — so `updateWorkspaceIngredient` moves
  it and writes no retirement, and a collision is refused on `name` as on
  create.

**The migration adds `slug` nullable and then sets it `NOT NULL` with no
backfill between** (`0025_ingredient-slugs.sql`, and its sidecar for the one
destructive statement). A backfill in SQL would be a second slug rule, and one
in TypeScript cannot run between two statements of one `drizzle-kit migrate`.
The task settles it: while no deployed code writes an ingredient, the table is
empty wherever the migration meets real data, and the seed is the backfill. A
local database the `standard` or `demo` scenario has already filled refuses
the step — `column "slug" of relation "ingredients" contains null values` —
and `npm run db:reset` (`make db-reset` from the host) rebuilds it. The test
and e2e databases are built from an empty schema every run and never meet it.

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
  audit. Seeds §5's six groups. No colour: form
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
— one an _animal_ part, one a _substance_ — are indistinguishable to
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
M5.10a renders it, so the dropdown offers "Wax (animal)" beside "Wax
(substance)". The schema test asserts the same-named pair is _accepted_, so
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

## The astrology vocabularies (MB.91; tables MB.92)

`planets` and `zodiac_signs` are the vocabularies behind
`ingredients.planet` and `ingredients.zodiac`, in
`src/modules/vocabulary/schema/astrology.ts`, migration
`0023_correspondence-vocabularies.sql`, seeded by
`src/db/seed/astrology.ts` (below), and read by a member's autofill ("The
member's autofill" below). They
replace a TypeScript constant of the same lists, deleted with the seed: a list
an admin cannot extend without a deploy is the shape `form` had before MB.35,
and wrong for the same reason. Files, scripts and functions say _astrology_
rather than _correspondence_, which in §5 names every property an ingredient
carries — element and deities too — not these two; the migration keeps the
name it shipped under, since its tag is in the journal.

- **`planets`** and **`zodiac_signs`** — each `id`, `name`, `slug`,
  `description` (NOT NULL, with a non-blank CHECK), + audit. Global,
  admin-curated, in the `vocabulary` module, both in one schema file as the
  form pair is. No group, no colour, no order column, no `workspace_id`.
  The only foreign keys are the audit stamps, and `ingredients.planet` and
  `.zodiac` point none at either table — `astrology-schema.test.ts`
  asserts both from the schema and by scanning the shipped SQL per statement.

**They are `form`'s pattern, and the two columns stay `text`.** A member
writes `planet` and `zodiac`, so by MB.35's rule each is text over a
vocabulary rather than a foreign key: a value off the list stays writable,
soft-deleting a row rewrites no ingredient, and the value moves into the
uncurated bucket instead. `nomenclature` and `element` stay enums — closed
sets, and `nomenclature` is coupled to `canonicalName` by a CHECK that names
`none` and `unknown` and could not read a table (DESIGN.md §14).

**Two tables, not one with a `kind` column**, for the reason the group tables
are two: a suggestion query that forgot the `kind` predicate would offer a
sign for `planet`, and two tables leave no predicate to forget.

**Uniqueness is on `slug`, partial on `deleted_at IS NULL`**, as on the four
tables above, and the display name carries no constraint. The description CHECK
is the form tables': a curated value explains itself, and here the description
is also search surface.

**One multicolumn `gin_trgm_ops` index per table over `(name, description)`**,
spelled as `ingredients_trgm` is, since the suggestion query matches both and
the set is admin-extensible. At nineteen and thirteen rows the planner will
never use it, so MB.94 asserts the query shape — `%` and `<%` under thresholds
set in the transaction — and not an index scan, where M4.7 and M4.7a assert
both. `gin_trgm_ops` answers `<%` as it answers `%`.

**Where they differ from the form precedent, and why:**

- **One tier.** Nothing groups a body or a sign, so the seed needs a flat
  helper over `insertMissing` rather than `seedTwoTierVocabulary`, which
  assumes a group table.
- **The DESIGN.md table sits outside `forms.test.ts`'s slice.** That test
  reads every table line between ``**`ingredient_forms`**`` and
  ``**`ingredient_form_groups`**`` as a form, so §5's planet and zodiac
  table is placed after the `ingredients.form` paragraph and before
  `categories`, and MB.93's test slices its own anchors.
- **`standard` seeds no uncurated planet.** Its compendium's planet values are
  all curated names in title case, which match case-insensitively. MB.94
  decided against one: its tests write their own against an emptied
  `ingredients`, and one in the shared template would reach every
  workspace's suggestions and MB.95's to-do list.
- **Curating an uncurated value is not one click.** `description` is required,
  so the admin page's add control opens the create form prefilled with the
  value and asks for one (MB.95, and M5.6a for forms).

**The two readers are scoped differently.** A member's autofill (MB.94) offers
curated rows first, then uncurated values in use in the compendium and the
current workspace only. The admin's to-do list (MB.95) reads the compendium
tier only, since an admin reaches no workspace's ingredients (M6.6); its finder
joins `TIER_SEAM` in `tests/guards/module-boundaries.test.ts`, as the
autofill's does. A value is uncurated when `lower(btrim(value))` matches no
live row's `lower(name)`.

### The member's autofill (MB.94)

`findVocabularySuggestions(membership, vocabulary, query, page)` in
`src/db/repository/vocabularies.ts` is the read behind `planetSuggestions`,
`zodiacSuggestions` and `formSuggestions` ([`graphql.md`](graphql.md)). Its
services are `suggestPlanets`, `suggestZodiacSigns` and `suggestForms` in
`vocabulary`, which ask
`ingredient: ['read']`: the curated rows are global, and every in-use value is
one a reader of the workspace could already list. A caller names a table and
nothing else. The ingredient column each table suggests for is paired in the
repository, keyed by table name, so a caller cannot hand `planets` the
`zodiac` column, and a fourth vocabulary does not compile until it names its
column. `ingredient_forms` is the third, paired with `form` (M4.7a).

One page is one statement: a `UNION ALL` of three tiers, sorted, bounded and
cut by cursor as a whole.

| Tier | Rows                                                                                                                  | Matched by                          |
| ---- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 0    | live curated rows whose name matches                                                                                  | `name % query` or `query <% name`   |
| 1    | live curated rows whose description alone matches                                                                     | `query <% description`              |
| 2    | values on live ingredients in the compendium or the proof's workspace, folding to no live curated row's `lower(name)` | `value % query` or `query <% value` |

- **A description matches by `<%`, never `%`.** `%` compares whole
  strings, and a query is a word or two against a sentence: `serpent` is 0.12
  similar to Ophiuchus's description and `black moon` 0.22 to Lilith's, far
  under 0.4. `<%` is word similarity, the query against the best-matching run
  of words in the text, and scores both 1.0. It is a trigram operator too, so
  "Fuzzy matching"'s rule still holds, and its threshold is the second one
  `selectFrom` sets.
- **A name or an in-use value matches by either.** `<%` completes a typed
  prefix: `mer` is 0.33 similar to Mercury and 0.75 word-similar. A name
  should never be harder to find than its own description.
- **Each tier is alphabetical, case-folded**, not ranked by score. The tiers
  carry the ranking the story asks for — a name match before a description
  match, curated before in use — and a name is an exact cursor key where a
  float score is not.
- **An in-use value is folded to `lower(btrim(value))`**, so `Moon`, `moon`
  and `Moon` are one value, offered in the spelling most of those entries
  use (`mode()`, a tie broken by sort order). A blank value is no value. A
  fold equal to a live curated name is never in tier 2, whether or not that
  row matched the query, so a value is offered once, as the curated row, or
  not at all. Soft-deleting a curated row moves its in-use spellings into
  tier 2.
- **Tier 2 reads both tiers of `ingredients`**, the compendium and the proof's
  workspace and never another, so the finder is on
  [the tier seam](modules.md#the-tier-seam). The scope is in the statement,
  so a value that only unrelated workspace X holds never reaches the service.
- **A blank query matches everything**, so an opened field can list the whole
  vocabulary before anything is typed. The statement still runs under the
  thresholds, with no trigram predicate in it.
- **The union is read through `selectFrom`.** `selectFrom` takes a
  `Derived` — a parenthesised statement and the columns read off it — in
  place of a table, in its `Similarity` mode, so the rule that every read is
  built in `select.ts` and the thresholds hold for a read no one table holds. The finder writes its
  own keyset bounds: a cursor's key is the two parts `[tier, fold]` and its
  id the tie-break, which is the curated row's id or the fold, compared as the
  row `(tier, fold, tiebreak)`. A key of any other length, or naming a tier
  there is not, throws `InvalidCursor`, as a cursor that will not cast does in
  `findPage`.

**A form suggestion carries two things more** (M4.7a), and only a form's
does — the finder is overloaded on the table, so a planet or sign suggestion
has neither:

- **Its group.** `ingredient_forms` is unique on the slug alone, so two live
  rows may share a display name ("Wax", animal and substance), and
  `ingredients.form` stores the string. The group is the only thing that tells
  them apart, so tiers 0 and 1 join `ingredient_form_groups` and return its
  name, and the tie-break is `lower(group name) || ' ' || id`, so a
  same-named pair reads in group order. **A form is curated only while its
  group is live too**: the join filters both `deleted_at`s, in tiers 0 and 1
  and in tier 2's "folds to no live curated name", so a form under a
  soft-deleted group is offered as an in-use value with no group, and a dead
  group's name is never returned. M5.6b decides what happens to the forms
  when a group is deleted; this is only what the autofill reads meanwhile.
- **Its claimants** — every live ingredient in the compendium or the proof's
  workspace whose `lower(btrim(form))` equals the suggestion's fold, as
  `{ name, canonicalName }`, formal names first (`nulls last`), then label,
  then id. A second, scoped read of `ingredients`, aggregated once by fold
  and left-joined onto the page — every claim rather than only those
  matching the query, since a form found by its description is claimed under
  its name. `json_agg`, not `jsonb_agg`, so the order it is built in is the
  order read. Both same-named forms carry the same claimants, since the
  string is all an ingredient holds.

**The common-name autofill** (M4.7a) is `findCommonNameSuggestions(membership,
query, page)` in `src/db/repository/common-names.ts`, the read behind
`commonNameSuggestions`, whose service is `suggestCommonNames` in
`ingredients`. There is no curated vocabulary of common names, so it is
tier 2 alone, keyed and cut exactly as above by the shared
`readSuggestionPage` (`suggestion-page.ts`):

- **An in-use common name is a live in-scope ingredient's display name or a
  live folk name of one**, a `UNION ALL` of two arms folded to
  `lower(btrim(name))` and offered once, in the spelling most of them use.
  The display name is read because it is one — "Cat's Claw" is the label of
  five seeded rows and of §5's own example — and picking a suggestion writes
  a folk-name row either way. **A formal name is not read**: it is identity,
  not something this field writes.
- **Each arm matches its own column** by `%` or `<%`, so each can reach
  its own trigram index, and the fold follows. Trigrams ignore case and
  punctuation, so every spelling of a fold matches alike and a claimant is
  never lost to the query.
- **The claimants are the group's own rows**, each ingredient once: one whose
  label and a folk name fold alike appears in both arms, so a
  `row_number()` over `(fold, ingredient)` filters the aggregate.

**Its plan is asserted, unlike the vocabularies'.** Both tables grow with
use, so `common-names-plan.test.ts` plans the statement the service sends,
as `duplicates-plan.test.ts` does, and asserts `ingredients_trgm` and
`ingredient_folk_names_trgm` are both probed. Two things were measured on
the way:

- **The display-name arm is matched beside the scope, and that is the
  planner's call to make.** Below some tens of thousands of entries it walks
  `ingredients_compendium_identity_unique` — the scope's
  `workspace_id IS NULL` is that index's partial predicate — and filters by
  name; the probe wins above it. Measured on a 10,000-entry compendium the
  walk took 31 ms where the probe takes 1, tolerable behind a debounced
  field. The test seeds 50,000 entries, which it needs: at 30,000 the full
  statement still walks.
- **`findSimilarIngredients`' `id IN (…)` shape does not transfer.** Over a
  single table it is a self-join on the primary key, which Postgres 18's
  self-join elimination removes, leaving the same plan. It survives there
  only because its `IN` is a union over two tables.

**No planner assertion for the vocabularies.** At nineteen, thirteen and
seventy-eight rows `planets_trgm`, `zodiac_signs_trgm` and
`ingredient_forms_trgm` are never chosen over a sequential scan, so
`suggestions-query.test.ts` asserts what the service sends instead: both
thresholds set in the transaction before the match, `%` and `<%` where a
`similarity()` comparison could have been, the scope and soft-delete
predicates, and the fold. It captures the statements as
`duplicates-plan.test.ts` does. `suggestions.test.ts`,
`form-suggestions.test.ts` and `common-name-suggestions.test.ts` hold the
behaviour, each refusal and scope case with the precondition that made it
possible.

## Stock, and the one module that owns the units (M9.2)

`src/modules/ingredients/schema/inventory-items.ts` holds DESIGN.md §5's stock
table; `0013_illegal_red_hulk.sql` is the migration. The unit vocabulary it is
built from sits beside it, in `src/modules/ingredients/schema/units.ts`, and
imports nothing.

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

`src/modules/ingredients/schema/units.ts` is the single source of the vocabulary — three dimensions,
metric and imperial in each: weight (mg, g, kg, oz, lb), volume (ml, l, tsp,
tbsp, fl_oz, cup), count (piece, drop, pinch). Both pgEnums (`inventory_unit`,
`unit_dimension`), the CHECK constraint below, M9.5's `unitConvert()`, M9.8's
badges and every later Zod enum are built from it. **Adding a unit is one
edit** — that map, plus a regenerated migration.

It imports nothing, and that is what makes it importable from all three sides
despite sitting in `schema/`: the tables import it relatively, and so do the
conversion library and the Zod schemas, which must not reach the database
layer at all (rule 2, MB.33) — a file that imports no `drizzle-orm` carries
none in. It sits in `schema/` rather than in `src/lib/` because the tables are
built from it, which puts it in the graph drizzle-kit loads.

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
  vocabulary can make — and §5 names no figure, so the reasoning sits here.
  Both columns take precision and scale from `schema/quantities.ts`, which
  also gives `StockInput` its ceiling of 999,999,999.999, so an amount the
  column cannot hold is a field error rather than a raw overflow
  ([`validation.md`](validation.md)).
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

`src/modules/grimoire/schema/spells.ts` and `src/modules/grimoire/schema/spell-ingredients.ts` hold
DESIGN.md §5's two grimoire tables; `0014_cooing_bug.sql` is the migration.
What a workspace _makes_, as against what exists (the compendium) and what it
holds (`inventory_items`).

- **`spells`** — `id`, `workspaceId`, `title`, `intent`, `jarSize`,
  `sealWaxColor`, `moonPhase`, `dayOfWeek`, `instructions`, `status`,
  `visibility`, + the full six-column audit spread. Stories 47 and 50's table.
- **`spell_ingredients`** — `spellId`, `ingredientId` (nullable), `name`,
  `form`, `quantity`, `unit`, `layerOrder`, `note`, + the four audit stamps,
  keyed on `(spell_id, layer_order)` and hard-deleted (MB.34). Stories 50 and
  57's table: a layer is an ingredient the workspace knows or a custom name
  written for this one jar. M10.2 shipped it keyed on
  `(spell_id, ingredient_id)`; MB.40 moved the key (`0017`) once a row could
  exist without the pair.

**`visibility` arrived a wave later than the rest of the table** (M10.3,
`0018_spell-visibility.sql`), after M1.23 had seeded spells against it — which
is what made "existing seeded spells migrate to workspace visibility" a
criterion that could be tested rather than one an empty table satisfied for
free (TASKS.md, "Breaking the M1.23 ↔ M10.3 cycle"). The rule it carries is
["Spell visibility"](#spell-visibility-m103) below.

### The join names the ingredient, never the stock row

`spell_ingredients.ingredientId` references `ingredients`. Stock is what a
workspace happens to hold today; a recipe pointing at it would be damaged by
running out of something, and M10.21 tests exactly that. The test proves the
target rather than asserting it twice: an id that exists only in
`inventory_items` is refused with a foreign-key violation naming
`spell_ingredients_ingredient_id_ingredients_id_fk`, while the same insert
against an ingredient the workspace holds no stock of is accepted. Repoint the
key and the pair swaps which one reddens.

### Layer order is the identity, and what that costs the reorder

`layerOrder` is `integer NOT NULL` and, since MB.40, half of the primary key:
`spell_ingredients_spell_id_layer_order_pk` on `(spell_id, layer_order)`. M10.2
had the same pair as a unique index beside a `(spell_id, ingredient_id)` key;
once a row could exist without an ingredient id the pair could not be the key,
and the layer was the only thing every row has. Each half is load-bearing:

- **Stored, not inferred.** Story 51 makes layering part of the recipe, and no
  query may lean on insertion order.
- **NOT NULL** — by construction now, as a key column — because a nullable
  column would satisfy neither half of "stored and unique within a spell":
  distinct NULLs collide with nothing, so an unordered row would sit outside the
  key meant to constrain it.
- **Leading on `spell_id`**, which both scopes the key to the one jar and makes
  its index the one that answers "read this spell's ingredients in order" —
  every read of the table in M10.9 and MB.6.
- **No surrogate id.** An `id` column would say nothing about the jar, and the
  schema test asserts its absence.

A key is checked per row rather than at end of statement, so **M10.16's reorder
cannot be a single `set layer_order = layer_order + 1` sweep** even though the
final state is conflict-free. It rewrites the jar's rows instead, which a
hard-deleted table makes an ordinary delete-and-insert — and under this key
that rewrite replaces primary keys, which is fine for the same reason. The
schema test pins both directions — the sweep is refused, the rewrite succeeds —
so the constraint the reorder has to work within is written down before the
reorder is.

### Custom ingredients (MB.40)

Story 57: a spell may call for something the workspace will never stock. A row
in `spell_ingredients` is either an ingredient the workspace knows
(`ingredient_id`) or a name written for this one jar (`name`, with an optional
free-text `form`) — exactly one of the two. The design argument is in DESIGN.md
§5 and [`mb.40-custom-spell-ingredients.md`](design-decisions/mb.40-custom-spell-ingredients.md);
this is what holds it in the database.

- **`ingredient_id` is nullable, and the foreign key stays.** Nullability costs
  nothing in integrity because the first CHECK below forbids the row that would
  exploit it — §14's "nullable FKs plus `num_nonnulls`" idiom.
- **Four CHECKs**, each named so a refusal says which rule it broke:
  `spell_ingredients_ingredient_or_name` is
  `num_nonnulls(ingredient_id, name) = 1`;
  `spell_ingredients_form_only_on_custom` is
  `ingredient_id is null or form is null`, because `form` beside an ingredient
  id would be a second copy of half that ingredient's identity;
  `spell_ingredients_name_not_blank` and `spell_ingredients_form_not_blank` are
  the `ingredients_form_not_blank` idiom, since a blank name would satisfy
  `num_nonnulls` and name nothing.
- **Two partial unique indexes, one per kind of row.**
  `spell_ingredients_spell_id_ingredient_id_unique` on
  `(spell_id, ingredient_id) WHERE ingredient_id IS NOT NULL` is one ingredient
  per jar — what the M10.2 key used to give — and
  `spell_ingredients_spell_id_custom_name_unique` on
  `(spell_id, lower(name)) WHERE ingredient_id IS NULL` is one custom name per
  jar, the shape of `ingredients_workspace_label_unique`. Both are partial and
  neither predicate is rule 4's: there is still no `deleted_at` here. The
  predicate is a discriminator, so each index covers exactly the rows that have
  the column it is unique on.
- **Name only, not name plus form, in the custom-name index.** A custom row is
  never matched against anything, so there is no identity key for `form` to be
  part of; a jar that wants valerian root and valerian leaf writes two names.
  This is the one judgment call in the shape, and the decision record says so.
- **Still hard-deleted, still the four stamps.** A custom row carries content,
  but content addressable only through its spell — unlike a folk name, which
  stands on its own — and MB.34's deciding argument was the
  `deleted_at IS NULL` a service joining _through_ this table would have to
  remember by hand, which is exactly how derived categories (M10.7) reach
  `ingredient_categories`.
- **`form` is text, not a foreign key**, for the reason `ingredients.form` is
  not: a member must be able to write `rhizome` before anyone has curated it.

`spell-ingredients-schema.test.ts` proves every refusal by its
`constraint_name` and pairs each with the insert that shows why it could have
succeeded: `form` on a linked row is refused where the same `form` on a custom
row is accepted; `Threshold Salt` and `threshold salt` collide in one jar and
not across two; the same ingredient twice is refused by the partial index, a
layer collision by the key. What Wave 13 inherits — the Zod exclusive-or, the
skip in derived categories, no suppression, no held/not-held, no safety source
— is written into each task's criteria rather than left to be remembered.

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
  neither on this table, the dimension is derivable through `src/modules/ingredients/schema/units.ts`,
  and the query that groups stock by dimension has no counterpart here.
- **No index and no CHECK on `spells`**, beyond the primary key's. §5 names
  none, the grimoire's own lookups are M10.9's, and a spell title is not unique
  — two workings may share a name in one coven.
- **No reverse index on `spell_ingredients`.** §5 asks for one on
  `ingredient_categories` ("what is in this category") and asks for none here;
  no v1 feature lists spells by ingredient, so the asymmetry is §5's rather than
  an oversight.

Both tables are inert until Wave 13. Nothing queries them until M10.5's service
and M10.10's mutations land — the table-task-then-behaviour-task rule, the
reason the DDL could be constrained at Wave 3 while the tables were empty, and
the reason MB.40 could reshape `spell_ingredients` in Wave 4 as a contract
migration against zero rows rather than as a retrofit across every consumer.

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

**A drop is the contract step alone, and it is two PRs, each its own task.**
The first removes every code reference — the Drizzle schema included — and
ships no migration. The second, once the first has deployed, is the migration
`drizzle-kit generate` then produces, with its sidecar. `migrate.yml` runs
before `deploy.yml` promotes, and Drizzle names every declared column in a
`SELECT`, so dropping a column the live deploy still declares breaks its reads
for the length of the rollout, and a rollback past the migration for good.
Between the two, `db:generate` on any branch emits the drop; it belongs to
the second task, and the destructive-DDL check refuses it unacknowledged.
MB.82 and MB.107 are the worked case: MB.82 stopped declaring `pending_slug`
and its date, and MB.107 dropped them.

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

  In the schema file (Drizzle), both columns exist on the table for this
  release:

  ```ts
  export const spells = pgTable('spells', {
    // ...
    name: text('name'), // deprecated — still written, read as a fallback only
    title: text('title'), // canonical as of Release N
    // ...
  });
  ```

  And the write path (inside `withAudit`, in the module's `services/`) writes both;
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
  and writing `title` only. **This migration is destructive** — it needs an
  acknowledgement sidecar beside it — `src/db/migrations/00MM_drop-spells-name.ack.md`,
  in the form described below — precisely because a same-release
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
comment reading `'never drop this'` is prose rather than DDL. Statements are
split on `;` with no awareness of dollar-quoted bodies, so a PL/pgSQL function
is judged as several fragments rather than one statement — harmless while no
rule spans a `BEGIN … END`, and the first thing to fix if one ever must. Only `*.sql` is
ever scanned: the `meta/*.json` files Drizzle writes beside each migration are
excluded by the paths filter in `pr-gate.yml` **and** by the script, which
ignores anything else it is handed.

It passes automatically when none of those forms appear. When one does, that
migration must carry an **acknowledgement sidecar** beside it (MB.48), named
for the migration it covers:

```
src/db/migrations/0002_solid_marauders.sql
  → src/db/migrations/0002_solid_marauders.ack.md
```

containing, anywhere in the file, a line of the exact form:

```
Destructive DDL acknowledged: <reason>
```

(case-insensitive, a non-empty reason required) — see the script's own header
comment for the regex and the reasoning. There's no such line format
elsewhere in the repo to stay consistent with; this is the one place it's
defined, so `claude-docs/ci.md` and the script both point back here.

**It used to live in the PR body, and that was wrong twice over.** A PR body is
visible from one branch base and gone on merge, so a release PR — which
`resolveDefaultBase` sends at `origin/main`, rescanning every migration since
the last release — sees none of the acknowledgements that let those migrations
land; release 0.2.0's PR failed this check for exactly that reason and was
merged past it. And one line in a body blessed **every** finding in the diff,
whatever file it was in, so a release carrying an acknowledged `0017` and an
unacknowledged `0002` would have passed on `0017`'s line alone. The sidecar
fixes both: it travels with the file, and it covers only the file beside it.
The PR-body path is retired rather than OR-ed with the sidecar — an `OR` would
keep the uncorrelated hole open — so the check now reads nothing from GitHub
at all, which is what lets `make act-check CHECK=destructive-ddl` prove the
scan rather than the wiring.

A `.md` sidecar rather than a comment inside the `.sql`: the regex anchors at
the start of a line, so Markdown matches it unchanged where
`-- Destructive DDL acknowledged: …` would not. And every file list here is
scoped to `*.sql`, so a sidecar is never itself scanned.

**Locally, `npm run check:destructive-ddl` scans what this branch adds** —
every migration new or changed against its Gitflow base (`origin/staging`, or
`origin/main` for a `hotfix/*` or `release/*` branch), including one
`db:generate` has just written and not yet committed. `--base <ref>` picks
another base. `--all` scans every committed migration instead, which is an
audit rather than a gate — and since MB.48 it is a **usable** one: both
migrations carrying destructive DDL ship their sidecars, so `--all` is green
and goes red on a real omission. It was permanently red before, first because
the bare command _was_ that full scan (fixed in MB.37) and then because the
acknowledgements it needed only ever existed in PR bodies.

Four migrations carry findings today, and each has its sidecar:

| Migration                           | Findings                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `0002_solid_marauders.sql`          | `DROP CONSTRAINT users_email_unique`, and `created_by` / `updated_by` added `NOT NULL`                              |
| `0017_custom-spell-ingredients.sql` | the `(spell_id, ingredient_id)` primary key and the `(spell_id, layer_order)` unique index dropped                  |
| `0025_ingredient-slugs.sql`         | `ingredients.slug` set `NOT NULL` with no backfill between, the seed standing in for one ("Ingredient slugs" above) |
| `0028_drop-pending-slugs.sql`       | the two pending-slug indexes and columns dropped, the contract half of MB.82's change ("Expand/contract")           |

**`0002`'s sidecar was written retroactively, and says so.** This document
previously claimed its `DROP CONSTRAINT` and two `NOT NULL` columns "were
acknowledged when they landed". That was false: [PR #73][pr73] carries no
acknowledgement line and never did, because it merged during the window MB.32
opened and MB.37 closed, when `destructive-ddl` had been dropped from
`pr-gate.yml` and ran on nothing. The migration was never asked for a line, so
the reasoning in its sidecar is reconstructed from the migration and the schema
rather than recovered. `0017`'s ports [PR #126][pr126]'s wording verbatim,
which was correct and argued at the time.

[pr73]: https://github.com/Aurora-Arctic/Sorrel-and-Salt/pull/73
[pr126]: https://github.com/Aurora-Arctic/Sorrel-and-Salt/pull/126

## Audit columns and `applyAudit` (M1.15, FKs restored MB.5, split MB.34)

`src/db/audit.ts` exports two column-set _factories_, and
`src/modules/identity/schema/users.ts` exports the two _instances_ every
table spreads, built by calling them with `() => users.id`:

- **`auditStampColumnsReferencing(usersId)`** → `auditStampColumns` —
  `createdAt`, `createdBy`, `updatedAt`, `updatedBy`.
- **`deletionColumnsReferencing(usersId)`** → `deletedAt` and `deletedBy`,
  which `users.ts` spreads after the stamp _instance_ to make
  `auditColumns`. The six-column set is the four-column one plus two, from
  the same builders, and `tests/db/audit.test.ts` asserts that identity.

The factories take the referenced column rather than importing `users`, so
`audit.ts` depends on nothing in a module; the instances live beside `users`
because every stamp references it, and a table imports them from there —
`import { auditColumns } from '../../identity/schema/users'`, relative, since
the schema graph is what drizzle-kit loads.

Every table spreads `...auditColumns` **except the three join tables**:
`ingredient_categories`, `spell_categories` and `spell_ingredients` spread
`...auditStampColumns` and are hard-deleted (MB.34) — see "Hard delete on the
three join tables" below for why, and note that `workspace_members` and
`ingredient_folk_names` are _not_ in that set. Writing the six columns as the
four plus two rather than listing them twice is what stops the two sets
drifting, and `tests/db/audit.test.ts` asserts each stamp column is literally
the same builder object in both.

`createdBy`/`updatedBy`/`deletedBy` carry
`.references((): AnyPgColumn => users.id)` per DESIGN.md §5, including for
`users`' own rows (`users.created_by -> users.id`, a genuine self-reference,
since `users.ts` spreads the instance it builds from its own id). Drizzle's
thunk defers evaluation past module load, so the self-reference is fine; the
explicit `AnyPgColumn` return annotation is what stops TypeScript reporting a
circular reference trying to infer it. `src/db/bootstrap.ts`
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
tables then carrying the four audit stamps. The trigger takes the same name,
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
  `tests/db/updated-at-trigger.test.ts` proves it by faking `Date` alone
  (`toFake: ['Date']`, leaving the driver's timers real), running a
  `withAudit` update whose payload says the year 2000, and reading back this
  year.

**Better Auth's three adapter tables are deliberately excluded.** `accounts`,
`sessions` and `verifications` carry an `updated_at` and no `*_by` columns at
all: nothing writes them through `withAudit`, they are not part of the audit
trail, and Better Auth's own `$onUpdate` stamps them (`src/modules/identity/schema/auth.ts`).
Its fourth, `rate_limits` (MB.75), carries no `updated_at` at all — Better
Auth's model declares none — so it is not a counter-example the sweep could
mistake, and `UNAUDITED_TABLES` leaves it out.

### A table added later does not get the trigger for free

An event trigger would attach one automatically on `CREATE TABLE`, but
`CREATE EVENT TRIGGER` requires superuser and `sorrel` deliberately is not one
("Migrations and scripts" above). So **a new audited table adds its own
`CREATE OR REPLACE TRIGGER` line in its own migration** — one line, copied.
`0023_correspondence-vocabularies.sql` (MB.92) is the first to do it, for
`planets` and `zodiac_signs`.

What makes forgetting that a failing test rather than a review note is
`tests/db/updated-at-trigger.test.ts`, the catalogue-introspection guard the
sweep-task rule requires. It applies the whole migration set into the worker's
clone — which tables the sweep reached is the thing under test, so unlike the
per-table schema tests it stubs nothing — and then compares two catalogue
queries: the tables carrying all four audit stamps, and the tables carrying a
`set_updated_at` trigger. A new audited table reddens it without that
file being edited. The list of eighteen is transcribed there as well, because
two empty sets are equal and something has to say they aren't.

## The repository's files (MB.87)

`src/db/repository/` is one file per concern, and callers import only its
`index.ts` — `@/db/repository` resolves to it:

| File                   | Holds                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`             | Named re-exports only — the pinned surface below — and nothing declared                                                                                               |
| `types.ts`             | The table shapes a finder or writer admits, the options `selectFrom` reads, the `AuditWriter`, and what a finder takes and returns; the index re-exports the last two |
| `predicates.ts`        | The `scopedTo`, `inCompendium` and `notSoftDeleted` predicates, each decided by the table's shape                                                                     |
| `write.ts`             | `withAudit` and the writer it builds                                                                                                                                  |
| `select.ts`            | `selectFrom` and `existsIn`, the two places a read query is built; the keyset bounds a page is cut by; the two similarity thresholds                                  |
| `ingredients.ts`       | The ingredient finders: the fuzzy-duplicate match, the compendium list and its count, one entry, an entry by identity, and an ingredient's children                   |
| `slugs.ts`             | The compendium entry at a slug, and the redirect from a retired one                                                                                                   |
| `vocabularies.ts`      | `findVocabularySuggestions`, the planet, zodiac and form autofill, and `findIngredientFormValues`                                                                     |
| `common-names.ts`      | `findCommonNameSuggestions`, the common-name autofill                                                                                                                 |
| `suggestion-page.ts`   | The keyset page and claimant list the two autofills share                                                                                                             |
| `finders.ts`           | The generic finders, scoped and unscoped, and the escape hatch                                                                                                        |
| `spells.ts`            | The three spell finders, the `readableSpells` predicate they share, and the two hatches that read what a spell holds past a tombstone                                 |
| `memberships.ts`       | Two of the three reads that take no proof                                                                                                                             |
| `users.ts`             | The third: the live row holding an address                                                                                                                            |
| `provisional-users.ts` | The provisional-account delete                                                                                                                                        |

**The rest of the folder is internal, and that is enforced rather than
conventional.** `selectFrom` and `existsIn` are exported from `select.ts`
because the finders beside them build on them, so the language no longer keeps
them private as it did when the repository was one file. What keeps them inside the folder is a
`no-restricted-imports` group banning `@/db/repository/*` and
`**/db/repository/*` everywhere (restated in each override, which replaces
rather than merges), and `tests/guards/module-boundaries.test.ts`, which
resolves every import in `src/` and fails any edge into the folder that is
not its index — the spellings a glob cannot see included. The index itself
declares nothing and has no `export *`, so what it names _is_ the surface;
`soft-delete-finder-guard.test.ts` asserts both. Its first import is
`schema/users.ts`, for the load-order reason under "The seed module" —
`tests/db/repository/index.test.ts` pins it.

## The write path — `withAudit` (M1.16)

`src/db/repository/` is the only code that imports `db` from
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

**No update or soft delete reaches a soft-deleted row.** The writer ANDs
`deleted_at IS NULL` onto the `where` of every one of them, by the scoped and
by-id variants too, decided by the table's shape as the finders' filter is —
`notSoftDeleted(table)`, dropped for a join table, which has no tombstone to
skip. So a tombstone is never rewritten, a service updating a deleted row by
id finds nothing and answers `NotFound`, and a second delete cannot
overwrite who made the first. The way back to a deleted row is v2's restore,
a named method per tier, with an edit after it rather than in place
(DESIGN.md §13, "Edit history").

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
built it; "The Membership proof" below is how it works. The specification for
the eventual policies —
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
next request that reuses it. `tests/db/repository/write.test.ts` asserts this directly —
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

**Testing against a scratch table.** `tests/db/repository/` mirrors the
folder — `index.test.ts`, `write.test.ts`, `finders.test.ts` and
`memberships.test.ts` — and runs in the `db` project against this worker's
`sorrel_test_<n>` clone. The clone has carried the full schema since M1.27,
and each file still creates its own `repository_probe_herbs` table spreading
the real `auditColumns` (minus the FKs to `users`) and drops it afterwards,
through `useProbeTables()` in `tests/support/db/probe-tables.ts`: the repository's contract is the
six audit columns, not any one table's other constraints. The
six columns exercised are the ones every real table will carry.

That table carries one extra column no real table will:
`acting_user text default current_setting('app.current_user_id', true)`.
It records what the GUC held _inside_ the transaction that inserted the row,
which is how the M1.19 tests observe a setting the narrow `AuditWriter`
gives them no other way to read — without widening the write API for the
benefit of a test. The `missing_ok` second argument is what makes it null,
rather than an error, when the setting was never set.

## The Membership proof (M6.3)

CLAUDE.md rule 5 asks for two authorization layers: the check, and a proof the
check ran. `assertMembership` is the first and its return value is the second.

```ts
const membership = await assertMembership(session, workspaceId, { spell: ['create'] });
const drafts = await findManyInWorkspace(membership, spells, eq(spells.status, 'draft'));
await withAudit(session, (write) => write.insertInWorkspace(membership, spells, { title }));
```

`Membership` is `{ workspaceId, userId, role }` carrying a `unique symbol`
brand that `src/modules/coven/services/membership.ts` does not export. No other file can
name the property, so no object literal satisfies the type and the one cast to
it in the codebase sits past both of `assertMembership`'s refusals. The brand
is erased at compile time: the layer costs nothing at runtime — no second
connection, no transaction on the read path, no per-environment credentials,
which is the trade MB.29 made when it deferred RLS.

### What the check asks

The third argument is a **permission**, not a minimum role: `{ spell:
['create'] }`, checked against per-role statements built with better-auth's
`createAccessControl` (`src/modules/coven/services/access-control.ts`). Naming a resource or
an action the statements do not declare is a compile error. Several resources
in one request are ANDed. An empty request throws an `Error` rather than a
`Forbidden` — it would authorize vacuously, so it is a caller's bug and reads
as one.

Why statements rather than the rank the design doc originally specified, and
what that costs while most of the services are still unwritten:
[`m6.3-permission-statements.md`](design-decisions/m6.3-permission-statements.md).

The **site role** is not consulted. `session.role` is `'user' | 'admin'` and a
site admin curates the compendium and reaches no workspace at all, so
`assertMembership` never reads it — which is what makes that invariant true by
construction rather than by a branch someone could add later.

**An id that is not a uuid is refused before the lookup.** A `workspaceId` is
whatever string the client sent, and compared with a `uuid` column anything
else is a driver error, which the route would mask as
`INTERNAL_SERVER_ERROR`. `assertMembership` checks it with `RowId` from
`src/lib/validation.ts` and refuses it with the bare `Forbidden` an unknown
workspace gets, so every workspace-scoped service answers it the same way
without a guard of its own. `tests/db/graphql-workspace-ids.test.ts` sends a
malformed id to every GraphQL field that takes a `workspaceId`, and fails on a
field it does not name.

### One lookup per render

`assertMembership` reads the role through `cache(findWorkspaceRole)`, so a
layout and a page asking about the same workspace in one server render cost one
query, whatever permission each asks for; the permission check under it runs
every time and costs nothing. The cache is keyed by `(userId, workspaceId)`
rather than the session, because `cache()` compares object arguments by
identity and two callers holding equal sessions would each miss. It lives as
long as the render and no longer, and outside a render it is the plain finder:
the GraphQL route handler has no React cache scope, so its dedupe is the
request's DataLoaders ([`graphql.md`](graphql.md), "The two transports").

### The finder convention

The repository splits on the table's own shape, the way it already splits
`softDelete` from `delete`:

| The table                                                              | Reads                                                                                                                | Writes                                                                                                                               |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| carries `workspace_id`                                                 | `findManyInWorkspace` / `findOneInWorkspace` / `findOneByIdInWorkspace`, proof first                                 | `insertInWorkspace`, `updateInWorkspace`, `updateByIdInWorkspace`, `softDeleteInWorkspace`, `softDeleteByIdInWorkspace`, proof first |
| carries a nullable `workspace_id` (`ingredients`, its retired slugs)   | the scoped reads above, the named compendium finders, and `findIngredientsInSpellsIncludingSoftDeleted`, proof first | the scoped writes above, and `insertInCompendium`, `updateByIdInCompendium`, `softDeleteByIdInCompendium`, `SiteAdmin` first         |
| carries `visibility` (`spells` alone)                                  | `findManySpells` / `findOneSpell`, proof first                                                                       | the workspace-scoped writes above                                                                                                    |
| carries `spell_id` (the two join tables)                               | `findManyInSpell`, proof first                                                                                       | `insert`, `update`, `delete`                                                                                                         |
| carries `ingredient_id` and no `workspace_id` (folk names, categories) | `findManyOfIngredients`, proofs first; `findManyOfSpellIngredientsIncludingSoftDeleted`, proof first                 | `insert`, `update`, `softDelete` / `softDeleteByIds` / `delete`                                                                      |
| none of those                                                          | `findMany` / `findOne` / `findOneById` / `findManyByIds` / `findManyIncludingSoftDeleted`                            | `insert`, `update`, `updateById`, `softDelete`, `softDeleteByIds`, `delete`                                                          |

`{ workspaceId: AnyPgColumn }` and `{ workspaceId?: never }` are the two
constraints, so each finder admits exactly one of the two sets and a table
cannot go through the wrong one. The spell rows are M10.3's, added by
excluding `visibility` and `spell_id` from the finders above and below them:
["Spell visibility"](#spell-visibility-m103). The ingredient-children row is
M4.8's, added the same way by excluding `ingredient_id` from the unscoped
finders: ["Ingredient children"](#ingredient-children-m48). A scoped finder ANDs `workspace_id =
membership.workspaceId` onto the query **itself** rather than trusting a
`workspaceId` beside the proof — a second source is a second thing to
disagree — and `insertInWorkspace` fills the column from the proof for the same
reason, which is why its `values` type has `workspaceId` removed the way it has
the audit columns removed. `updateInWorkspace` cannot reassign it either, so a
row cannot be moved between workspaces by an update.

`findManyIncludingSoftDeleted` takes the unscoped side: v1 has no restore UI
and the trash view is v2, so the task that adds one adds its proof-scoped
counterpart then rather than leaving a widened hatch waiting. It is one of
three hatches: the other two read what a spell holds past an ingredient's
tombstone, proof first ("What a spell holds").

**`ingredients` is on the scoped side, so its compendium tier has no generic
finder.** The column is nullable — `workspace_id IS NULL` is the
compendium, everything else is a workspace's own — so the table matches
`{ workspaceId: AnyPgColumn }` and `findMany(ingredients)` does not compile.
The reads of it so far are `findSimilarIngredients` (see "Fuzzy matching"),
`findVocabularySuggestions` and `findCommonNameSuggestions` (see "The
member's autofill"), `findManyOfIngredients` through the parent of a folk
name or a category link (see "Ingredient children"), and
`findIngredientsInSpellsIncludingSoftDeleted` through a spell holding it (see
"What a spell holds"), each naming
both tiers as explicitly as this paragraph asks, and each listed on
[the tier seam](modules.md#the-tier-seam). The plain compendium read is
`findCompendiumPage` (M8.5), with its count `findCompendiumCount` (MB.105),
each ANDing `inCompendium` as explicitly as the scoped finders AND their proof, and `findOneIngredient` reads one row in the
compendium or a proof's coven ("The compendium read"), and
`findCompendiumEntryByIdentity` (M5.2) reads the entry holding an identity
("Compendium writes"); the local-beats-compendium resolution (§5) wants both tiers under an anti-join and
is a further named finder, M8.3's. The point of the narrowing is that a read
of that table has to say which tier it means instead of getting whichever the
default was.

`findOneById` and `findManyByIds` are the read-side twins of `updateById`: a
service cannot build `eq(table.id, id)` or `inArray(...)` (MB.33), and a
by-id read, one or batched for a loader, is what nearly every service needs.
They sit on the unscoped side only; the workspace-scoped by-id read is
`findOneByIdInWorkspace` (M8.2), the read-side twin of
`updateByIdInWorkspace`, which ANDs the id onto the proof’s own clause. `findManyByIds` answers an empty list
without a query.

### The three reads that take no proof

`findWorkspaceRole(userId, workspaceId)` is what mints a proof, so it cannot
demand one. It is narrow on purpose — it answers with a role, not with rows —
so it cannot stand in for a finder.

`findMembershipsOfUsers(userIds)` is the second, for the same kind of reason:
a user's own memberships span workspaces, so there is no one workspace to
hold a proof for. It answers the live `workspace_members` rows of those users
whose workspace is live too — the workspace's `deleted_at` is a correlated
`EXISTS`, as in `findManyInSpell`, because the repository keeps one select
builder. Who may ask about which ids is the calling service's decision:
`membershipsOf` in `coven` answers the caller's own id and refuses every
other, an admin's included.

`findUserByEmail(email)` is the third (MB.54), for the same kind of reason
again: an address is claimed site-wide, so there is no workspace to hold a
proof for. It answers the live row holding the address, compared lower-cased
as `users_email_lower_case` holds every row to, and what a hit means is the
calling service's decision — `setEmail` refuses an address a verified row
holds and lets a provisional one be claimed over, and the `/verify-email` gate
refuses one any other live row holds (`auth.md`, "The email page").

`tests/db/repository/index.test.ts` and `soft-delete-finder-guard.test.ts`
both pin the repository's export list, so a fourth exception is a decision
rather than an addition.

### Where the proof is weaker than a policy

Stated rather than glossed, because the type looks like it closes more than it
does. **Both gaps are covered by M6.6's per-entity direct-id denial tests**,
which is the same coverage that would have caught a policy written wrong:

- A service holding a **valid proof for W** that hand-writes a `where` naming
  X's ids satisfies the type and still reads across workspaces. The proof
  constrains which workspace the query is scoped to, not which ids the caller
  chose to ask about.
- **`spell_ingredients` and `spell_categories` carry no `workspace_id`**, so
  the column name a guard would infer the scoped set from says "unscoped" about
  the two tables holding what a spell is made of — which is why DESIGN.md §8
  says "workspace-scoped" is not the same as "has a `workspace_id` column".
  M10.3 closed this one by making it a third shape rather than a subset of the
  unscoped side: both tables carry a `spell_id`, the unscoped finders now
  refuse them on it, and `findManyInSpell` reaches them through the parent
  spell. M4.8 closed the same gap for `ingredient_folk_names` and
  `ingredient_categories`, which carry an `ingredient_id` and no
  `workspace_id`: the unscoped finders refuse them on it, and
  `findManyOfIngredients` reaches them through the parent ingredient. That
  leaves the first gap above as the live one.

A cast is the third gap, and it is review's job rather than the type's: a value
that already has the proof's public shape is _comparable_ to it, so
`{ workspaceId, userId, role } as Membership` compiles where `session as
Membership` does not. `tests/modules/coven/services/membership.test.ts` pins the two the type
does catch — the object literal and the forgery from a session — as
`@ts-expect-error` lines, which fail `npm run typecheck` the moment the brand
stops being required. A runtime assertion could not see that at all: it would
pass just as happily against a signature that had quietly gone optional.

## The SiteAdmin proof (M5.2)

Rule 5's two layers, on the site role rather than a workspace role.
`assertSiteAdmin(session)` in `identity`'s `services/site-admin.ts` is the
check — `session.role === 'admin'`, or `Forbidden` — and the `SiteAdmin` it
returns, `{ userId }` under a brand the file does not export, is the proof.
The writer's three compendium-tier methods demand it:

```ts
const admin = assertSiteAdmin(session);
await withAudit(session, (write) => write.insertInCompendium(admin, ingredients, values));
```

- **`insertInCompendium(admin, table, values)`** fills `workspace_id` with
  null, after `values`, as `insertInWorkspace` fills it from its proof.
- **`updateByIdInCompendium(admin, table, id, values)`** and
  **`softDeleteByIdInCompendium(admin, table, id)`** reach the one row with
  that id only while it is live and in the compendium — `workspace_id IS NULL`
  and `deleted_at IS NULL`, the second as every update ANDs it. A coven's row
  or a deleted one is written nothing and returns nothing, so an admin naming
  a coven's ingredient by id changes nothing.

**Why a proof, when the check is one comparison.** `ingredients` holds both
tiers in one table, so without it a compendium write would be one method call
away from every service that writes ingredients, the coven's own included, and
the admin check would be absent there rather than impossible — the test rule 5
sets. The proof carries nothing the query reads, since the compendium tier has
no id to scope by; what it buys is that the call cannot be written without the
check having run. It is erased at runtime, like `Membership`.

The methods take a **two-tier** table only: `TwoTier` in the folder's `types.ts`,
`{ workspaceId: AnyPgColumn<{ notNull: false }> }`, which `ingredients` and
`retired_ingredient_slugs` satisfy and a table whose `workspace_id` is
`NOT NULL`, like `spells`, does not. The vocabulary tables — categories,
forms, the astrology vocabularies — carry no `workspace_id`, have one tier,
and are written through `insert` and `updateById`: nothing below their
services stops a non-admin write to them, so each of those services checks
the site role itself.

The site role is a separate axis from the workspace role, as `assertMembership`
keeps it: `assertSiteAdmin` reads `session.role` and nothing else, which the
request read off the user's row, and a workspace role counts for nothing. A
cast from the proof's public shape compiles, as `Membership`'s does, and is
review's job; the object literal is pinned as a `@ts-expect-error` in
`tests/db/repository/write.test.ts`.

## Spell visibility (M10.3)

DESIGN.md §5: a `workspace` spell is readable by every member of its coven,
viewers included; a `private` spell is readable by its **author alone**, owners
not excepted. `spells.visibility` is a `spell_visibility` enum —
`'private' | 'workspace'` — `NOT NULL DEFAULT 'workspace'`.

**The author is `created_by`.** §5 gives spells no separate author column, and
nothing in v1 transfers authorship, so the audit stamp is the answer rather
than a second column that could disagree with it.

An enum rather than a `CHECK`, for the reason `status` is one: §13's notes
model carries a third tier, `public`, and adding a value to an enum is an
`ALTER TYPE … ADD VALUE` where widening a `CHECK` re-validates every row.

**The default is on the column, not in a service.** A spell written by any
path — a seed, a fixture, a service that never mentions visibility — joins the
shared grimoire. The failure mode of the other default is silent: a spell
nobody but its author can see, in a coven that cannot tell it is missing.

### Reading: three finders, and why the generic ones refuse

`readableSpells(membership)` is the predicate, and the only one: the coven from
the proof, `deleted_at IS NULL`, and `visibility = 'workspace' OR created_by =
membership.userId`. Both halves come out of the proof, so there is no id a
caller could pass that disagrees with the check that minted it — the argument
`scopedTo` already makes one layer down.

| Finder                                        | Reads                                                       |
| --------------------------------------------- | ----------------------------------------------------------- |
| `findManySpells(membership)`                  | every spell of the coven this member may read               |
| `findOneSpell(membership, spellId)`           | one by id, `undefined` when it is another's private spell   |
| `findManyInSpell(membership, table, spellId)` | a spell's rows in `spell_ingredients` or `spell_categories` |

The generic finders refuse all three tables, and that refusal is the point.
`spells` carries `visibility`, so `findManyInWorkspace` will not compile
against it; the two join tables carry a `spell_id`, so `findMany`, `findOne`
and `findManyIncludingSoftDeleted` will not compile against them. Two
`{ column?: never }` constraints do it, in the shape `{ workspaceId?: never }`
already had: `spells` and the join tables each go through one finder because
every other finder's signature excludes them. A private spell that a service
merely forgot to exclude is
_absent_; one the type will not let that service query is _impossible_, and
only the second survives the next service written in a hurry.

**Why the join tables need a finder of their own.** Neither carries a
`workspace_id`, so neither can scope itself, and a spell's visibility rule
would hold for the spell while its contents stayed readable to anyone who knew
the id — the rule holding for the jar and leaking what is in it. Both reach
their coven and their visibility through the parent spell, which
`findManyInSpell` expresses as a correlated `EXISTS` over `readableSpells` —
in SQL, per CLAUDE.md rule 7, so a row a caller may not see is never fetched to
be filtered out afterwards. The subquery is `existsIn`'s, the repository's
second read builder ("Soft-delete filtering" below), which ANDs the spell's
`deleted_at IS NULL` onto it by construction; `readableSpells` carries the same
filter for the two finders that read `spells` directly, so in this one finder
the parent is filtered twice, and neither copy is the other's to forget.

### What a spell holds (M5.3)

A spell is a record of a working, so an ingredient soft-deleted after it went
into the jar is still in it: shown as it was, its categories still counted
toward the spell's derived categories, its safety notes still warning. The
data already holds that — `spell_ingredients` points at the row, its foreign
key is `NO ACTION`, and a soft delete touches no layer. What would lose it is
the read, since every other finder filters a deleted ingredient and `existsIn`
filters a deleted parent by construction. So two finders in `spells.ts` are
named exceptions to CLAUDE.md rule 4, each ending `…IncludingSoftDeleted` so
the call site says what it is:

| Finder                                                                             | Reads                                                                                 |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `findIngredientsInSpellsIncludingSoftDeleted(membership, ingredientIds)`           | the ingredients among the ids that a spell this member may read holds, deleted or not |
| `findManyOfSpellIngredientsIncludingSoftDeleted(membership, table, ingredientIds)` | the live folk names or category links of those ingredients                            |

**Only the ingredient's tombstone is skipped.** The spell must be readable and
live (`readableSpells`), and the layer live (`existsIn` over
`spell_ingredients`, which filters a removed layer once MB.110 gives the table
a `deleted_at`, with no change here). The ingredient must be in the compendium
or the proof's coven: a layer's foreign key checks the id alone, so a W spell
linking X's ingredient is a row the schema accepts and the finder withholds. A
child's own tombstone still filters, so a folk name removed before the delete
stays removed. The children's finder reaches its parents through the first —
two statements rather than one — because a deleted parent's tier cannot be
tested through `existsIn`, and a raw subquery is what MB.100 removed.

Both take ingredient ids rather than a spell id. The layers come from
`findManyInSpell`, and their `ingredientId`s batch into the first, which is
the loader key M10.9's resolution needs; a custom layer names no ingredient to
ask about. `findManyOfIngredients` refuses `spell_ingredients` at compile time
since M5.3: the table carries an `ingredient_id`, and read through a
compendium entry it would have been every coven's layers of that entry,
private spells included. The soft-delete guard pins both hatches' shape
("Soft-delete filtering" below); the argument, and v2's revision-pinned layers,
are [`m5.3-spells-keep-deleted-ingredients.md`](design-decisions/m5.3-spells-keep-deleted-ingredients.md).

### Writing: the one-way rule

`src/modules/grimoire/services/spell-visibility.ts`'s `setSpellVisibility(session, workspaceId,
spellId, visibility)`. `private` may be widened to `workspace`; `workspace` may
never be narrowed back. Once the coven has read a spell and built on it, hiding
it retracts something they were relying on — widening is a gift, narrowing is a
retraction, so only one direction is allowed. The narrowing is refused with a
`Forbidden` **carrying a message that says so**, not the bare one: the caller
holds the permission, and a two-word refusal would send them looking for a
role they already have. The rule governs visibility and not existence — a
shared spell can still be deleted.

**There is no author clause in that service, and none is missing.**
`findOneSpell` has already answered `undefined` to everyone but the author, so
a member who cannot see a private spell cannot widen it either, and what they
get is `NotFound` rather than a refusal that confirms the spell exists.
Restating the visibility a spell already has is permitted: it is not a
narrowing, and refusing it would make an idempotent call an error.

M10.6 adds the pure `resolveSpellVisibility()` and the exhaustive transition
matrix; this is the half that runs against the database.

### `updateByIdInWorkspace`, and why it exists

MB.33 bars everything outside the database layer from importing `drizzle-orm`
at runtime, so a service cannot build the `where` that `updateInWorkspace`
takes. The eighth `AuditWriter` method builds the one predicate every entity
update needs — `id = $1`, ANDed onto the proof's own clause — below that
boundary. `tests/db/repository/write.test.ts` pins the method count, so each new one is a
decision argued for in its own PR rather than a convenience.

**`updateById` is the ninth** (MB.60), for the same reason on a table no proof
scopes: the primary admin's promotion writes `users.role` by the signed-in
user's own id, and the service cannot build `id = $1` either. It is the
unscoped twin, typed to refuse a table carrying `workspace_id`, so a scoped
update cannot take this route around the proof.

**`softDeleteByIds` is the tenth** (M8.2), for the same reason on the delete
side: saving an ingredient tombstones the folk names the save dropped, a batch
of ids the service holds and cannot turn into `id IN (…)`. It is the
soft-delete twin of `findManyByIds` — unscoped, typed to demand a
`deletedAt` and refuse a `workspace_id`, and an empty list writes nothing.
The proof still governs it: the ids come from `findManyOfIngredients` under
the parent’s tier, inside the transaction that has just written the parent
through the proof (see "Workspace ingredients").

**`softDeleteByIdInWorkspace` is the fifteenth** (M5.3), the delete-side twin
of `updateByIdInWorkspace`: a coven member's delete names its ingredient by
id, which the service cannot turn into `id = $1`. It ANDs the id onto the
proof's clause, so another coven's row and a compendium row are written
nothing and returned as nothing. Like `updateByIdInWorkspace` it admits
`spells`, whose visibility its type cannot see, so a spell's delete reads
`findOneSpell` first, as `setSpellVisibility` does.

## Ingredient children (M4.8)

`ingredient_folk_names` and `ingredient_categories` hang off an ingredient and
carry no `workspace_id` of their own, so by column name they look unscoped
while holding a coven's rows. They take the tier of their parent: a compendium
entry's children are public (MB.80), and a workspace entry's are its coven's.
The shape is the one M10.3 gave the spell join tables. `{ ingredientId:
AnyPgColumn }` is `IngredientScoped`, and the unscoped finders demand `{
ingredientId?: never }`, so `findMany(ingredientFolkNames)` does not compile
(`tests/db/repository/finders.test.ts` pins it with `@ts-expect-error`).
`inventory_items` carries an `ingredient_id` too, but also its own
`workspace_id`, so it never reached the unscoped finders to begin with.

**One finder, `findManyOfIngredients(memberships, table, ingredientIds)`.** It
returns the live child rows of those ingredients whose parent is live and is in
the compendium or in a coven one of the proofs names, a correlated `EXISTS`
built by `existsIn` for the reason `findManyInSpell` gives: the tier is decided
in SQL, and the parent's `deleted_at IS NULL` is the builder's rather than the
finder's. It takes a _list_ of proofs because one
page can hold both tiers and, in principle, several covens. An empty list reads
the compendium alone, which is how a signed-out request reads it. It reads both
tiers in one statement, so it is on [the tier seam](modules.md#the-tier-seam).

**Two services and two loaders over it**, in `ingredients`: `categoriesOf` and
`folkNamesOf` in `services/ingredient-children.ts`, batched as
`categoriesByIngredient` and `folkNamesByIngredient`
([`graphql.md`](graphql.md), "Loaders"). A key is the parent row's `{ id,
workspaceId }`. The `workspaceId` decides which proof to ask for, one
`assertMembership(…, { ingredient: ['read'] })` per coven the batch names, and
a coven the caller may not read answers `Forbidden` in its own keys' slots
while the rest of the batch stands. It is never the scope. A key that lies about
its tier gets zero rows, because the `EXISTS` reads the parent's real one. So a
workspace entry's children are refused by three layers, each sufficient alone:
the check, the SQL, and the type above. `tests/modules/ingredients/loaders/`
asserts the first two by direct id, each with its precondition, and each fails
with its layer removed.

Folk names come back as strings, flattened as §7's `folkNames: [String!]!`
exposes them; categories come back as rows, with a soft-deleted category
dropped by `findManyByIds`. Each list is sorted by name. The cost is one read
for folk names and two for categories, plus one role lookup per coven in the
batch, whatever the number of ingredients.

## Workspace ingredients (M8.2)

A coven's own ingredients are written and read by four services in
`ingredients`' `services/workspace-ingredients.ts`:
`createWorkspaceIngredient`, `updateWorkspaceIngredient` and
`deleteWorkspaceIngredient` ask `{ ingredient: ['create'] }`, `['update']` and
`['delete']`, which owners and members hold, and
`getWorkspaceIngredient` asks `['read']`, which viewers hold too. A site admin
holds none of them, as everywhere in a coven.

**The tier is the proof's, so nothing here promotes a row to the compendium.**
`insertInWorkspace` fills `workspace_id` from the proof, `updateByIdInWorkspace`
cannot reassign it, and `LocalIngredientInput` strips a `workspaceId` a caller
smuggles in. The update and the read reach only a live row, and only through
`workspace_id = membership.workspaceId`, so a compendium entry's id, another
coven's or a soft-deleted ingredient's answers `NotFound`, the same as an id that names nothing, and naming a
coven the caller is not in answers `Forbidden` before any row is read, a coven
id that is not a uuid included ("What the check asks"). An ingredient id that
is not a uuid is `NotFound`, as `getIngredient` answers it, rather than a
driver error.

**A delete is soft, and frees what the ingredient held** (M5.3).
`deleteWorkspaceIngredient` tombstones the row through
`softDeleteByIdInWorkspace`, with the update's reach: an id this coven does not
hold live answers `NotFound`. Its folk names, category links and stock row
stay. A spell holding the ingredient still reaches it ("What a spell holds"),
and nothing else reads past a deleted parent — stock included, whose reads go
through a live ingredient (M9.3). The service test asks each read a member
reaches the coven's ingredients through whether it shows the ingredient,
before the delete and after, then brings back its label, its formal name
under another label and the whole ingredient at its old address, each refused
while it was live. Inside a coven the label is unique too, so there a label
coming back does prove its index's predicate. Its mutation is
`deleteIngredient` ([`graphql.md`](graphql.md), "The workspace ingredient
mutations").

**The input is the whole ingredient**, as `IngredientForm` submits it, parsed
again by the service with `parseInput` because the browser is not the only
caller. An update therefore replaces the row: every optional column is
written, `null` where the input has nothing. A merge would break the
nomenclature biconditional, because a missing `nomenclature` parses to
`none`, and `none` beside a kept `canonical_name` is the row the CHECK refuses.
Categories are not written here, since `LocalIngredientInput` carries none.
The service itself clears a field the input leaves out. Its mutation,
`updateIngredient`, makes leaving one out a schema error and clearing an
explicit `""` or `[]` ([`graphql.md`](graphql.md), "The workspace ingredient
mutations").

**Folk names are written in the ingredient's own `withAudit` transaction**,
never in a second round trip. A create inserts each one. An update diffs the
list against the live rows, read through `findManyOfIngredients` under the
proof, comparing names as written. A name still listed keeps its row and its
`created_by`. A dropped one is soft-deleted through `softDeleteByIds`. A new
one is inserted. The tombstones go first, so a name re-added in another case
clears the case-folded unique index before the insert meets it. The service
test asserts the one transaction by comparing `xmin`: every row a
transaction writes carries its id.

**The slug follows the label, the form and the formal name.** `slug` is
`NOT NULL`, so a create writes `ingredientSlug` of the three, and an update
writes it again from the new values. Nothing redirects from the old one: no
route reads a coven ingredient's slug, so MB.82's retirements are the
compendium's alone ("Ingredient slugs").

**A collision is a `ValidationError` on the field that caused it**, never the
raw index error. The service catches the write's failure and reads the index
name off it with `violatedUniqueIndex` (`src/lib/unique-violation.ts`), which
walks the error's `cause` chain for SQLSTATE 23505 without importing the
database layer, since a service may not (MB.33). The label index lands on `name`, and so does the
identity index for an entry with no formal name, whose label is its identity.
With a formal name, the identity index lands on `canonicalName`. The slug index lands on `name`, naming
the address, on a create or on an update that moves the slug. Catching the failure rather than checking first is deliberate: a
check-then-write leaves a window for a concurrent save, and the index is the
one arbiter either way. The message names what the input asked for, not the
row already holding it. The compendium's writes do name the holder, through a
finder that builds the key from the values ("Compendium writes"); inside one
coven the label index makes the case that needs it rarer, and a coven-scoped
twin of that finder is the change that would add it here.

## The compendium read (M8.5)

The compendium is the public surface (MB.80), so its reads take no proof and
no session. Three services in `ingredients`' `services/compendium.ts` and one
in `vocabulary`'s `services/ingredient-form-values.ts` sit over four
finders, the three that read the compendium tier named on
[the tier seam](modules.md#the-tier-seam).

**`findCompendiumPage(filter, page)`** is one keyset page of the compendium
under an `IngredientFilter`, every part optional and absent meaning no filter.
A search pages best match first, `(score DESC, name, id)`, and a list without
one pages `(name, id)`; each entry carries a `score`, null on the second:

- **`query`** is word similarity, case- and accent-folded, against the display
  name, the formal name or a live folk name:
  `unaccent_immutable($query) <% unaccent_immutable(column)`, true when the query
  is at least **0.5** word-similar to some run of the text. That forgives a
  transposed pair (`mugwrot` is exactly 0.5 to Mugwort), matches a
  two-letter prefix as it is typed (`mu`, 0.67), and reads across
  punctuation (`devils shoestring`, 0.8), where pg_trgm's own 0.6 misses the
  typo. A query of punctuation alone has no trigrams and matches nothing.
  pg_trgm's GIN answers `<%` when the text side is the index's own
  expression, which is what `ingredients_unaccent_trgm` and
  `ingredient_folk_names_unaccent_trgm` (migration 0027) are for, and
  `unaccent_immutable` (0026) is the `IMMUTABLE` wrapper an expression index
  needs; `ingredients-unaccent.test.ts` proves by `EXPLAIN` that each
  predicate reaches its index. The three matches are a `UNION ALL`, the
  shape "Fuzzy matching" argues for over an `OR` beside the scope.
- **The score is the row's best word similarity** across the three, and it is
  the search's order. Each `UNION ALL` arm selects
  `word_similarity(query, text)` beside the id it matched — the value the GIN
  recheck has just computed to test `<%` — and the union is folded to
  `max(score) … group by id` and joined to `ingredients` as `matched`. So the
  score is a plain column, read by the order, the page bound and the edge
  alike, once per matched row. The alternative, a `greatest(…)` over the three
  with a correlated subquery for the folk names, is a `SubPlan` that a page
  bound evaluates against every compendium row. `compendium-search-query.test.ts`
  runs `EXPLAIN ANALYZE` on the statement the finder sends, over ~20,000
  entries and as many folk names under `enable_seqscan = off`: the first page
  and the page after a cursor both start from `ingredients_unaccent_trgm` and
  `ingredient_folk_names_unaccent_trgm`, with no `SubPlan` and no sequential
  scan, and the test prints the ranked and unranked timings — about 7 ms and
  5 ms when it was written.
- **A keyset, not a capped top-N or pg_trgm's `<<->`.** A top-N would leave
  every match past the cap unreachable and give a search a different shape
  from a browse, against rule 8. `<<->` is a nearest-neighbour order: it needs
  a GiST index where these are GIN, orders by one text where the score is the
  best of three, and cannot resume after a cursor. The key is `[-score, name]`
  plus the id — negated so one ascending row comparison bounds it, and `real`,
  as `word_similarity` returns it, because a `real` prints shortest-exact and
  its cursor text casts back to the same value (`1 - score` would promote to
  `double precision`). A browse's cursor has one part and a search's two, so
  neither is a position in the other, and each is `InvalidCursor` there.
- **The 0.5 is set by `selectFrom`, as every threshold is.** The finder marks
  its keyset `wordMatch` when there is a query, and `selectFrom` then reads the
  page in a transaction that sets `pg_trgm.word_similarity_threshold` with
  `set_config(…, true)` first — the similarity branch's shape, on the keyset
  branch. `compendium-search-query.test.ts` reads the statements sent: the
  setting before the match, and no transaction for a page with no query.
- **`categoryIds`** is AND: one correlated `existsIn(ingredient_categories, …)`
  per id, so an entry must carry every one. OR is M8.12's argument to add.
- **`form`** compares `lower(btrim(…))` on both sides, the fold
  `canonical_key` uses.

Names order under the database's own collation (`en_US.utf8` in the image).
M8.14's `(lower(name), canonical_key, id)` declares its parts on the same
keyset mechanism ("Keyset pages"). Moving a cursor's sort is harmless, since a
cursor lives only as long as the page it came from.

**`findCompendiumCount(filter, start)`** (MB.105) numbers those pages: how
many entries the filter holds, and how many precede `start`, a page's first
row — the count mode of "Keyset pages". It and `findCompendiumPage` each
state the tier and the soft-delete filter, since the tier seam and the
soft-delete guard read each exported finder, and both take the filter's arms
and the key from one private `compendiumList(filter)`, so the count reads
exactly the rows the pages hold. On a search that means the join and the 0.5:
counted at the server's 0.6, `mugwrot` (0.5 to Mugwort) would count none of
the rows its pages list. `compendium-search-query.test.ts` reads the one
statement sent, after the setting, with no order and no limit.

**The service treats a query shorter than two characters as absent**
(`MIN_QUERY_LENGTH` in `validation/compendium-filter.ts`, counted in composed
code points). One letter shares a trigram with half the compendium at 0.5, so
it would filter and rank by noise; below the minimum the list is a browse,
unfiltered and unranked. The finder takes whatever it is handed, one
character included.

**`findOneIngredient(memberships, id)`** is one live row in the compendium or
in a coven one of the proofs names, in the shape of `findManyOfIngredients`. No
proofs reads the compendium alone, which is how a signed-out request reads it,
and a coven's row asked for without its proof is `undefined`, the same answer
as an id that names nothing.

**`findIngredientFormValues(page)`** is one keyset page of the curated form
vocabulary in `(name, id)` order: the live forms whose group is live too, which
is what curated means to `findVocabularySuggestions` as well, with the group's
`deleted_at` read by `existsIn`.

**The services parse ids first.** `listCompendium` and `countCompendium` run
their filter through `CompendiumFilter` (Zod, in `validation/compendium-filter.ts`) and
`getIngredient` checks its id the same way, and the reason is `selectFrom`'s
keyset branch: it maps every SQLSTATE class-22 error to `InvalidCursor`, on the
premise that the cursor is the only client text a page query carries. A
category id compared to a `uuid` column is client text too, so a malformed one
is refused before the query or it would come back as "Invalid cursor". The
check is `z.guid()`, not `z.uuid()`: Postgres's `uuid` takes any version and
variant, and the seed's hand-written ids are not RFC-shaped. `getIngredient`
takes an optional `workspaceId`; with one it asks
`assertMembership(…, { ingredient: ['read'] })` — a signed-out caller, a site
admin and a non-member get `Forbidden` — and reads both tiers, without one it
reads the compendium alone, and a miss is `NotFound` either way.

## Compendium writes (M5.2)

Three services in `ingredients`' `services/compendium.ts`, beside the reads:
`createCompendiumEntry(session, input)`, `updateCompendiumEntry(session, id,
input)` and `deleteCompendiumEntry(session, id)`. Each opens with
`assertSiteAdmin`, before the input is parsed, so a non-admin is refused the
same way whatever they sent, and writes through the compendium-tier methods
under its proof ("The SiteAdmin proof"). A workspace role counts for nothing:
a coven's owner is refused as its viewer is.

**They mirror the coven's writes** ("Workspace ingredients") in everything but
the tier. The input is the whole entry, so an update replaces the row. Folk
names are written in the same transaction, the update's diff reading the live
ones through `findManyOfIngredients` with no proofs, which is the compendium
alone. The slug follows the label, the form and the formal name, and the one
an update leaves is retired and redirects for 180 days ("Ingredient slugs").
The row mapping and the folk-name diff live in one internal file,
`services/ingredient-rows.ts`, which both services import. Categories are not
written here, since `CompendiumIngredientInput` carries none.

**`nomenclature` is required.** `CompendiumIngredientInput` gives it no
default, because every compendium entry declares a naming system, `none` and
`unknown` included as answers (§5). A write that leaves it out, or sends
null, is a `ValidationError` on `nomenclature` from the parse, before
`withAudit` opens; the column's `NOT NULL` would have answered with a driver
error instead.

**The reach is the compendium's live rows.** A coven's ingredient, a
soft-deleted entry, an id that names nothing and one that is not a uuid are
all `NotFound`. So the site admin reaches no coven's ingredients by id — the
invariant in `CLAUDE.md` — and the service test asserts it on update and
delete with the row first shown reachable by its own coven. A delete is soft
and stamps `deleted_by`; the entry's folk names and category links stay,
since only a spell holding the entry reads them past it ("What a spell holds")
and their unique indexes are per ingredient. A `workspaceId` in the input is stripped by the Zod object,
and `insertInCompendium` would overwrite it if it were not.

**A deleted entry is gone from every read and frees what it held** (M5.3).
The service test asks each read an entry reaches anyone through — the list
and its count, the read by id, its address and one it moved off, its folk
names and categories, and a coven's duplicate warning and its common-name and
form suggestions — whether it shows the entry, before the delete and after.
It then adds the entry's formal name and form again under another label, the
write the identity index refused while the entry was live: the index's
`deleted_at IS NULL` is all that lets it through. The proof is on the formal
name, because two live entries may share a label anyway, so a label coming
back would pass with the predicate gone. The whole entry comes back the same
way, at its old address, and when a later write collides with the
re-added entry, the error names that entry rather than the deleted one,
though both rows carry the key. A spell holding the deleted entry still
reaches it.

**A collision is a `ValidationError` on the field that caused it, naming the
entry that already holds the identity.** As in the coven's writes, the service
catches the write's failure and reads the index off it with
`violatedUniqueIndex`:

- `ingredients_compendium_identity_unique` lands on `canonicalName` when the
  input declares a formal name, and on `name` when it does not. A `none` or
  `unknown` entry keys as its label, and §5's cross-namespace case is a label
  equal to another entry's formal name, where a message beside the empty
  formal-name field would point at a box the admin never filled in. The
  message names the holder by its label, formal name and form:
  `Already in the compendium as "Mugwort" (Artemisia vulgaris, herb)`.
- `ingredients_compendium_slug_unique` lands on `name`, as the coven's does,
  naming the address and the entry holding it: `"Testwort" (root) already has
the address "testwort-root" — change the name, form or formal name`.

The holder is read after the write has rolled back, by
`findCompendiumEntryByIdentity({ name, canonicalName, form })`: the live
compendium row whose `canonical_key` equals the key those values would take.
The key comes from `canonicalKeyOf` in the table's schema file, the builder
the generated column is built from too, so the finder folds the values
exactly as Postgres folded the row and the key has one spelling. Given the
bare column names it renders the text the migrations hold, byte for byte, so
`db:generate` sees no change. A holder gone by the time it is read — deleted
between the two statements — leaves the message without a name rather than
surfacing the raw error.

Firing `revalidateTag` after each write is M8.7's, once M8.6 has put the
compendium behind the cache (CLAUDE.md rule 6). The GraphQL mutations over
these services are M5.5's.

## Soft-delete filtering and the partial-index convention (M1.20)

CLAUDE.md rule 4 / DESIGN.md §5: **no exported query can return a soft-deleted
row, and no call site does its own filtering.** `src/db/repository/select.ts`
holds the two places a read query is built — `selectFrom`, and `existsIn` for
a correlated subquery — and the repository exports three functions on top of
the first:

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

There are two such decisions, and both are the same one: what a spell holds.
`findIngredientsInSpellsIncludingSoftDeleted` and
`findManyOfSpellIngredientsIncludingSoftDeleted` (M5.3) read an ingredient
past its tombstone, and nothing else past one, for a member who may read a
spell holding it ("What a spell holds").

Neither builder is in the repository's surface — their siblings import them,
and nothing outside the folder may ("The repository's files" above) — so
there is no public handle a finder could reach the database through while
skipping the filter — the same shape as `AuditWriter` gives writes no path
around `applyAudit`.

**`existsIn(table, where)` is the second builder** (MB.100). A finder whose
scope lives on a parent row — `findManyInSpell`, `findManyOfIngredients`,
`findMembershipsOfUsers`, and the provisional-account delete's check for an
`accounts` row — narrows by a correlated `EXISTS` over that parent, and the
parent's own `deleted_at IS NULL` has to be inside the subquery;
`findIngredientsInSpellsIncludingSoftDeleted` nests two, the spell inside the
layer. The four were
`sql` strings while the guard allowed the folder exactly one `.select(`, and a
string is what a guard cannot read: each subquery's filter was its caller's to
remember, which made them the least-checked reads in the repository and the
rule meant to prevent an unfiltered read the thing producing one. `existsIn`
builds the subquery on the same `db`, ANDs `notSoftDeleted(table)` itself —
`undefined`, and so dropped by `and()`, for a table without the column,
`accounts` among them — and returns `SQL` rather than the builder, so a caller
can neither append to it nor await it. The outer row is named through its own
table's columns, which Drizzle qualifies, so the subquery correlates without
an alias. What stays a `sql` string is what no builder can say — "Where
queries may be built" lists it.

**The mechanical guard.** This is a code sweep (CLAUDE.md's sweep-task rule),
so it landed as the mechanism above plus a guard — and since MB.33 the sweep is
divided between two of them, by what each can make impossible.

`tests/guards/soft-delete-finder-guard.test.ts` covers the inside of the
repository. It reads every file in `src/db/repository/` as text and asserts:
the folder builds exactly two `.select(`/`db.query.` calls, both in
`select.ts`, one inside `selectFrom` and one inside `existsIn`, and
`existsIn`'s body calls `notSoftDeleted(`, so the subquery's filter is checked
the way `selectFrom`'s callers are; the index does not re-export either
builder or the predicates, so no caller can reach an unfiltered read; the index's re-exports
are pinned to the test's `EXPORTED_FUNCTIONS` list, so a further
export — a new escape hatch, or a finder that reaches the database some other
way — turns the test red rather than merely going unreviewed; and every
exported finder other than the escape hatches either calls `notSoftDeleted(...)`
directly or delegates to one that does. The hatches are a pinned list, each
named `…IncludingSoftDeleted`, and a last test holds the two spell hatches to
skipping the ingredient's filter alone: the spell's `readableSpells`, the
layer's `existsIn` and the proof's tier stay in the body.

A query built _outside_ the repository is the linter's job, not this test's —
see "Where queries may be built" below. It was this test's until MB.33, by
reading every tracked source file as text and looking for `.select(`, which
banned one spelling of a finder rather than the capability: `function findX()`
was caught and `const findX = () =>` was not, the global regex carried its
`lastIndex` between files, the brace matcher broke on a brace inside a string,
and it spawned `git` with a `safe.directory` workaround because CI runs the
container as root over a uid-1000 checkout. At Wave 2 there is exactly one table
(the scratch table in the repository's tests), which is the point: the guard
exists before there is anything to forget, and each later table's finder
adopts the mechanism in that finder's own PR rather than a retrofit pass.

**The partial-index convention.** Every unique index in this schema must
carry `WHERE deleted_at IS NULL`. Without it, a plain `UNIQUE` constraint
still matches a soft-deleted row's value, so deleting a record permanently
reserves its name/slug/whatever the index covers — the exact opposite of
"deleted records stay recoverable but invisible." `users_email_unique`
(`src/modules/identity/schema/users.ts`) is the worked example:

```ts
uniqueIndex('users_email_unique')
  .on(table.email)
  .where(sql`${table.deletedAt} is null`);
```

`tests/db/repository/finders.test.ts` proves the convention rather than merely stating it: a
second scratch table (`repository_probe_charms`) carries a unique index built
exactly this way, and the tests assert a live duplicate name is still
rejected, while soft-deleting the original row and reinserting the same name
succeeds — the row that comes back is a new id, and `findMany` sees only it.

**`users.email` is also held to lower case** (`users_email_lower_case`,
migration 0019, MB.60). The unique index is on the raw column, so without it
two live rows could differ by case alone, and both would match
`ADMIN_BOOTSTRAP_EMAIL`, which is compared case-insensitively. Better Auth
lowercases every address it writes; the constraint catches a row written by
hand. `tests/modules/identity/schema/users-schema.test.ts` inserts one.

## Keyset pages (M3.6)

A list that can grow is read one page at a time (CLAUDE.md rule 8). The finder
is `findPage(table, sort, page, where?)`, or
`findPageInWorkspace(membership, table, sort, page, where?)` for a
workspace-scoped table. `sort` is a list of parts, each ascending. Each finder
ANDs the same soft-delete and workspace predicates as `findMany` and
`findManyInWorkspace`, and adds a keyset bound:

```sql
where … and (a, b, id) > (cast($a as <a's type>), cast($b as <b's type>), cast($id as uuid))
order by a, b, id
limit $limit  -- the page plus one
```

- **`page` is a `PageRequest` from `src/lib/types.ts`**, already decoded
  and clamped by `resolvePage` (claude-docs/graphql.md, "Pagination"). `after`
  bounds from below and `before` from above. `inverted`, when walking backwards
  with `last`, reverses the `ORDER BY` only, and `resolvePage` puts the rows
  back in order.
- **A part is a column, or an expression with the type it is read as**
  (`SortPart`: `leaves.name`, or `{ expression, type: 'real' }`). An expression
  is read as `cast(expression as type)` in the order, the bound and the key
  alike, so the declared type is the one compared: `length(name)::real / 3` is
  `double precision`, and ordered raw against a `real` cursor it would replay
  rows. A descending part is written negated, so one row comparison serves.
  The compendium search's `[-score, name]` is the first computed key. The
  duplicate lookup's is the same shape over trigram similarity (MB.11), and
  M8.14's `(lower(name), canonical_key)` is the next.
- **Each row comes back with its cursor.** The key is selected as an array of
  each part cast to text, and compared by casting each back to its part's
  type (`getSQLType()` for a column), so Postgres compares a `timestamptz` to
  the microsecond. A key read through a JS `Date` would lose the microseconds
  and replay rows.
- **A cursor whose key has the wrong number of parts is `InvalidCursor`**,
  thrown by `pageBounds` before any read: it is a position in some other
  list.
- **A page may join one relation and carry values onto its entries.**
  `Keyset.join` is a parenthesised, aliased statement and its `on`, which a
  sort part or the `where` may read; `Keyset.carry` names values selected
  beside the row, which `resolvePage` puts on the edge. The compendium search
  joins its scored matches and carries the score this way, and the duplicate
  lookup carries its correlated score (MB.11).
- **A carried value is selected one `sql` layer deeper than it is written.**
  In a select with no join, Drizzle renders a column written directly in a
  selected expression without its table name (`buildSelection`'s
  `isSingleTable`). So the duplicate score's folk-name subquery,
  `… where folk.ingredient_id = ingredients.id`, would render as
  `where "ingredient_id" = "id"` and compare the folk-name table with itself.
  Only an expression's own top-level columns are unqualified, so the wrapper
  keeps every name, but it also drops a `mapWith`. A carried value is
  therefore read as the driver returns it. `ORDER BY` and `WHERE` are not
  built that way, which is why the order was right while the selected score
  was not.
- **The id breaks ties**, so rows sharing a sort key still sit in one total
  order, and a page boundary between two of them loses neither. Every table
  these finders take has an `id` (`Identified`), which rules out the three
  join tables.
- **A sort column must be `NOT NULL`**, by type. A NULL makes the row
  comparison NULL, and that row would fall out of every page. An expression's
  nullness is not in its type, so a nullable one is the caller's bug.
- **A cursor that will not cast** (SQLSTATE class 22) throws `InvalidCursor`.
  The cursor is the only client text in a page query, so a data exception
  there can only come from it.
- The query goes through the private `selectFrom`, which has an overload that
  adds the key column, the order and the limit. The one-builder invariant of
  `soft-delete-finder-guard.test.ts` therefore holds. `findPageInWorkspace` is
  one of that guard's `SCOPED_FINDERS`.

**A keyset list can be counted as well as paged** (MB.105), for a
connection's `totalCount` and `countBefore` (claude-docs/graphql.md,
"Pagination"). `selectFrom`'s count mode takes a `KeysetCount` — the list's
`KeyOrder` and a `start` cursor, the page's first row — and sends one
statement:

```sql
select count(*), count(*) filter (where (a, b, id) < (cast($a as …), cast($b as …), cast($id as uuid)))
from … [join …] where …   -- no order, no limit
```

- **`KeyOrder` is what a page and its count share**: the sort parts, the id,
  the join and the two threshold flags, `wordMatch` and `similarityMatch`.
  `Keyset` is a `KeyOrder` plus the page's `request` and `carry`. A finder
  builds its `KeyOrder` once, in one function, and hands it to both reads, so
  the count cannot drift from the pages it numbers.
- **The `where` is the page's without `pageBounds`.** The second count uses
  the same row comparison a `before` bound does, built by the same two helpers
  (`rowKey`, `cursorKey`), so "before the first row" means what the page's
  order means. With no `start` — an empty page — the second number is null.
- **It runs under the key's threshold.** Both reads go through `readKeyed`,
  so a `wordMatch` count sets 0.5 in its own transaction as the page does.
- **A position, not an offset.** The count labels a page and never seeks one,
  so a cursor stays a key.

A spell's page, the counterpart of `findManySpells` under the visibility rule,
is added by the grimoire task that first needs it, as its own finder, like
the other spell finders.

A page over rows no one table holds writes its own bounds under the same
rules: `findVocabularySuggestions` and `findCommonNameSuggestions` key a
statement by `[tier, fold]` and a tie-break ("The member's autofill"). That
page is read under the similarity thresholds, whose branch maps no data
exception to `InvalidCursor`, so `readSuggestionPage` checks the key's two
parts and the tier itself before building the bound.

`tests/db/pagination.test.ts` walks probe tables through `resolvePage` and the
real finders:

- every row once and in order, at page size 25 and at 7, with 7 placing page
  boundaries between tied keys;
- stability when rows are inserted before and after the cursor and
  soft-deleted mid-walk, including the row the cursor names;
- a backward walk;
- nine timestamps a microsecond apart;
- a compound, computed key — a negated `real` fraction, then the name — with
  ties on either part, forwards and backwards, and the key as Postgres prints it;
- workspace scoping, with the other workspace's rows present;
- the cursor refusals: a key that will not cast, an id that is not one, and a
  key with the wrong number of parts.

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

**No `deleted_at` also means no partial unique index**, on any of the three.
Rule 4's convention exists so a tombstone cannot reserve a name forever, and a
composite primary key has no tombstone to dodge: the pair is either there or it
is not, re-adding one that was removed is an ordinary insert, and
`WHERE deleted_at IS NULL` would not compile against these columns. The
exception is a predicate that is about something else — `spell_ingredients`
carries two partial unique indexes keyed on whether `ingredient_id` is null,
which is MB.40's custom-row split rather than soft-delete filtering.

**What makes it impossible to get wrong.** Two type constraints, both proved by
`@ts-expect-error` lines in `tests/db/repository/write.test.ts` (which fail `npm run typecheck`,
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
table in `tests/db/repository/write.test.ts` (`repository_probe_pairs`) exercises it: a delete
leaves no row, the same pair can be re-added afterwards with no partial index
to make it possible, and a delete rolls back with the rest of its transaction.

**All three are written.** `ingredient_categories` (M4.4, migration
`0009_amusing_ken_ellis.sql`) is the shape the other two take, and
`ingredient-categories-schema.test.ts` runs the same three assertions against
the real table rather than the scratch pair: `write.delete` removes the row
outright, the pair can be re-added afterwards — by a different member, whose
stamps the new row carries — and an ingredient's other categories are untouched.
`spell_ingredients` (M10.2, migration `0014_cooing_bug.sql`; reshaped by MB.40's
`0017`, and hard-deleted still) is the second, and
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

Its reader is M4.8's `categoriesByIngredient` loader, through
`findManyOfIngredients` and never a generic finder (see "Ingredient children"). §12's
assigned-versus-derived distinction reads it from the derived side: a spell's
derived categories are the union of what this table holds for its ingredients.

## `spell_categories` (M10.4)

Story 48's table: `spellId`, `categoryId`, + the four audit stamps, keyed on the
pair. `src/modules/grimoire/schema/spell-categories.ts`, migration `0015_wooden_zaran.sql`,
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

## The seed module (M1.21)

`src/db/seed/index.ts` exports `seed(db, { scenario })` — DESIGN.md's one
module for Docker, Vitest and Playwright, so a bug reproduces identically in
all three. Each consumer hands over its own handle; `SeedDatabase`
(`PostgresJsDatabase<Record<string, unknown>>`) is what `drizzle(client)`
actually returns, and is the parameter type because the bare
`PostgresJsDatabase` the stub declared defaults its schema to
`Record<string, never>` and rejects a real handle — unnoticed until this
task because `scripts/` is outside `tsconfig.json`'s `include`, so
`db-seed.ts`'s call was never typechecked.

**The seed writes through the handle it is given, not through `withAudit`**
— the one write path beside `src/lib/auth.ts`'s sign-up hook that does not,
and for the same reason: it is an identity bootstrap with no session to hand
over. What `withAudit` guarantees is kept rather than re-argued: one
transaction, `app.current_user_id` published first in the same
parameterised `set_config` form (M1.19), every stamp produced by the shared
`applyAudit`. The seed cannot hold any other handle — `src/db/seed/` is not
among the four files allowed to import `connection.ts` — which is what makes
the handle honest. The reasoning, and the alternatives it rules out, are in
[`design-decisions/m1.21-seed-writes-through-its-handle.md`](design-decisions/m1.21-seed-writes-through-its-handle.md).

**Import order is not load-bearing anywhere.** There is no cycle between
`audit.ts` and `users.ts` any more (MB.86): `audit.ts` exports factories that
take the referenced column and depends on nothing in a module, and the
`auditColumns` instance lives with `users` because every stamp references it.
So a seed module, the repository and drizzle-kit — which globs
`src/modules/*/schema/*.ts` and may enter the module graph at any schema file
— all see a fully built `users` whichever import comes first.

**Two helper modules carry what every seed repeats** (MB.51).
`src/db/seed/idempotent.ts` exports three functions. `beginSeedTransaction(db,
body)` opens the one transaction, publishes the GUC in `withAudit`'s
parameterised `set_config` form, inserts the bootstrap admin and then runs
`body(tx)`; every entry point — `seedMinimal`, `seedStandard`, `seedDemo`,
`seedCategories`, `seedForms` — is that call. `insertMissing(tx, table, wanted,
{ existing, keyOf, toRow })` inserts each `wanted` whose key `existing` did not
return, stamped by the bootstrap admin through `applyAudit`, and updates
nothing. `requireFrom(map, key, describe)` is a `Map` lookup that throws
`describe()`'s message rather than handing `undefined` to a NOT NULL column.
`existing` is the caller's own query on purpose: each site scopes it — fixture
ids by `inArray`, W's ingredients by `workspace_id`, the compendium by
`workspace_id IS NULL`, folk names case-folded — and each ignores `deleted_at`
where that choice can be read, rather than the helper deciding it once for
every table. The one insert that needs its rows back, `standard`'s compendium
entries, stays hand-written around `.returning()`.
`src/db/seed/two-tier-vocabulary.ts` exports `seedTwoTierVocabulary(tx, {
groupTable, itemTable, groups, items, itemNoun })` — groups, then the items
filed under them, each by slug — which `seedCategoryVocabulary` and
`seedFormVocabulary` call with their own tables and literals. The literals
(`CATEGORY_GROUPS`, `CATEGORIES`, `FORM_GROUPS`, `FORMS`) stay in
`categories.ts` and `forms.ts`, where the tests comparing them against
DESIGN.md import them from. The two table pairs are typed as a union rather
than a generic: their columns are identical, so the row type survives without
a cast.
`src/db/seed/flat-vocabulary.ts` exports `seedFlatVocabulary(tx, table,
items)`, the one-tier counterpart for a vocabulary with no group — each item
by slug, the same rules — which `seedAstrologyVocabularies` calls once
for `planets` and once for `zodiac_signs`.

**`minimal`** (`src/db/seed/minimal.ts`): one admin, one user, empty
compendium. The admin is the bootstrap user under the fixed
`BOOTSTRAP_USER_ID` (`…0001`, MB.5), inserted as its own
`created_by`/`updated_by` in a single self-satisfying statement — that insert
lives in `src/db/seed/bootstrap-admin.ts` since M4.3, because every seeded row
needs a creator and the category seed runs without `minimal` having gone
first; the plain
user is `MINIMAL_USER_ID` (`…0002`), created by the bootstrap user. Both
keep `canCreateWorkspace` false — a bare install has granted nothing. It is
**idempotent by fixed id** (`ON CONFLICT (id) DO NOTHING`), not by
truncating: a re-run adds nothing, and nothing is dropped — the reset that
drops is M1.24's. `standard` is M1.22's and `demo` M1.23's, both below.

## The category seed (M4.3)

`src/db/seed/categories.ts` seeds DESIGN.md §6: eight `category_groups` rows,
then the 63 `categories` that point at them. **It is not a scenario.**
`minimal` leaves the compendium empty by definition and M1.22's `standard`
consumes what this writes, which is why §6's seed lands a task ahead of it.
`npm run db:seed:categories` runs it; that is `scripts/db-seed.ts` with a
`categories` argument rather than a script of its own, because the client
import is one of the four pinned exemptions below and a fifth is a decision.

**Idempotency keys on the slug and ignores `deleted_at`**, which is stronger
than the partial unique index gives on its own: the index only stops a second
_live_ row, so a slug an admin had soft-deleted would be re-inserted on the
next run. Removing a category is a decision, and a seed that runs again on
every deploy would keep undoing it. Nothing already present is updated either,
so a retitled category and a retuned colour pair both survive — the point of
MB.35 is that the colour is the admin's from here on.

**The colours are resolved once, here.** MB.35 made a group's colour a pair of
hexes on the row, so M0.7's `$category-groups` Sass map is a seed source
rather than a runtime lookup; the sixteen hexes are written out as literals in
`CATEGORY_GROUPS`. `categories.test.ts` compiles M0.7's own
`category-group-color($slug, $theme)` and compares all sixteen, so retuning
the map without reseeding fails a test instead of drifting silently, and
recomputes the WCAG ratio for each against its own theme's ground (`$soot`
dark, `$parchment` light) rather than trusting M0.7's published table. Worst
pairing in the set is wellbeing's light hex at 4.74:1.

**Slugs are derived, not written down.** Every slug in the seed is
`slugify(name)` — `src/lib/slugify.ts`, the `slugify` package under pinned
options (`lower`, `strict`, `trim`, plus one charmap extension so an
underscore separates rather than vanishing). There is no second list to keep
in step, and no way to seed a row whose slug and name disagree. The rule is
shared rather than the seed's own because M4.3a's form vocabulary and M5.6's
admin mutations slug an admin-typed name with the same function, so a category
an admin adds lands in the same shape as a seeded one.

That is now a repo-wide rule rather than this seed's habit (CLAUDE.md,
Conventions): `src/lib/slugify.ts` is the only file that may import the
package or name a slug character class, and `tests/guards/slug-rule.test.ts` is
the mechanical half — it scans untracked files as well as tracked ones, so a
second implementation fails in the diff that adds it rather than after it
ships. The failure it exists to catch is quiet: two slug rules do not collide,
they disagree, and the disagreement surfaces only as a lookup that finds
nothing.

The visible consequence is in the group slugs: the package expands `&` to
"and", so "Protection & Defense" is `protection-and-defense`. DESIGN.md §6's
Slug column is corrected to match — it previously named eight hand-picked
short slugs, one of which (`grounding`, for "Craft & Change") collided with a
category slug inside its own group. Deriving removes that class of mistake
rather than fixing this instance of it.

`SASS_TOKEN_BY_GROUP_NAME` is where §6's vocabulary and M0.7's map keys meet,
and the only place they do. It is keyed by group _name_ rather than slug,
because the slug is derived and a map keyed on a derived value would need
rewriting every time the rule changed. M0.7's keys stay M0.7's words: renaming
one moves a token and the `--group-*` custom property generated from it, for
no gain now that nothing looks a colour up by slug (MB.35).

**It reaches staging and production on its own**, unlike every scenario seed:
`migrate.yml` runs `npm run db:seed:categories` against the deployed database
as a step after its own migrations, gated on a diff so it only fires when a
push actually changed a reference seed's files. Deploys are CI-only
and there is no shell on either database, so a vocabulary nobody can run by
hand has to arrive with the deploy that needs it. M4.3a's form vocabulary
and MB.93's planet and zodiac vocabularies share that step, that gate and
that summary — see below, and
`claude-docs/ci.md`.

One rule a later scenario inherits: write through the handle, stamping via
`applyAudit`, in `minimal.ts`'s shape.

`tests/db/seed/index.test.ts` is the `db`-project test: it applies the full
migration set into the worker's clone (the M1.18 pattern — the seed writes
into the real `users` table with its real self-referencing FKs, and "the
compendium is empty" needs tables to count), hands `seed()` a handle of its
own, and asserts the two rows, the fixed ids, the creator chain, idempotency,
and — through an `AFTER INSERT` trigger recording `current_setting('app.
current_user_id', true)` — that the GUC was published, the same
observation trick `tests/db/repository/write.test.ts` uses.

## The form vocabulary seed (M4.3a)

`src/db/seed/forms.ts` seeds DESIGN.md §5's form vocabulary: six
`ingredient_form_groups` rows — Botanical, Animal, Mineral, Substance, Fluid,
Curio — then the 78 `ingredient_forms` §5's table files under them, including
the twelve MB.28 first wrote and the seventeen the animal-derived and
whole-organism cases added. **It is not a scenario**, for the same reason the category seed is not one, and it lands a
task ahead of M1.22 for the same reason too: M1.22's ingredients carry `form`
values, and those should come from a vocabulary that already exists.
`npm run db:seed:forms` runs it — `scripts/db-seed.ts` with a `forms` argument,
the second target on the same script, because the client import there is one
of the four pinned exemptions below.

Everything structural is the category seed's, and since MB.51 literally so —
both call `seedTwoTierVocabulary` (above) with their own tables and literals:
groups first (`ingredient_forms.group_id` is a NOT NULL foreign key),
idempotency keyed on the slug and **ignoring `deleted_at`**, no update to
anything already present, every slug derived by `slugify(name)` rather than
written down, and the whole run inside one transaction that publishes
`app.current_user_id` and stamps through `applyAudit`. What it does not share is a colour: form groups section
an autofill dropdown rather than tinting a chip, so there is no Sass map to
resolve and no contrast floor to clear (§5, MB.35).

**The groups answer "what are you holding", not "how was it made".** Three
by source — Botanical, Animal, Mineral — for what still has the shape it grew
or was dug in; three by state for what has lost it: Fluid for what pours, Curio
for a made or found object, Substance for what has neither shape nor flow. A
powdered mineral is therefore a `powder`, and the ingredient's name says what it
was. The first cut of this vocabulary grouped by process instead — organism
part, preparation, matter — which named a group after a verb and put 21 of its
29 rows in one section; `forms.test.ts` now asserts no group holds more than
half the list, so that failure cannot come back quietly.

**There is no `Other`.** A value that fits no form is typed as free text —
`ingredients.form` is text, not a foreign key — and surfaces in the autofill's
second bucket and on `/admin/forms` as the curation to-do list. A curated
catch-all would swallow exactly the values that list exists to show, and two
unrelated oddities would collapse onto one key. `curio` is not that: it is the
catch-all _within_ Curio, for an object where the name is all there is to say.
M5.10a carries the other half — the suggestion list ends in an explicit "use
what you typed" row, so the escape hatch is visible rather than discovered.

Where a value could sit in two groups the seed takes one sense and says which:
`wax` is a Substance, rendered and set, so an admin who wants raw comb as an
Animal part adds a second row — and may, because uniqueness is on the slug
alone (§5).

**The descriptions are the criterion, not decoration.** §5's argument for the
non-blank CHECK is that a curated value exists to explain itself. So
`forms.test.ts` asserts more than that the column is filled: the descriptions are
pairwise distinct, so a row copied from the one above it fails rather than
reading fine in review.

**One row per kind of thing, not one per word.** `salve` and `balm` are one
`ointment`, and `tincture`, `infusion` and `hydrosol` are one `concoction` — each
description naming the words it stands in for. The second merge is the sharper
case: those three differ by solvent (spirit, water, distillation), and that
distinction is neither universally held nor reliably known at the moment
someone is labelling a bottle, so three rows asked a question the vocabulary
has no business asking. One genus, and the ingredient name carries the rest. That only works because the
suggestion query reads descriptions as well as names (§5, M4.7a): a reader
types `salve`, the dropdown offers _Ointment_, and the vocabulary stays short
without going missing at the word people reach for. A name match outranks a
description match, so `wax` still offers _Wax_ first. It is also why a
description is worth writing carefully beyond review: it is now search surface,
and `ingredient_forms_trgm` indexes the description beside the name (M4.7a).

**A description defines its own form and stops there.** An earlier draft ended
several of them with a redirect — "Set firm, it is a balm", "Distilled off a
plant it is hydrosol" — and a test asserted 30 such pairs named each other.
Both are gone: a definition that has to enumerate its neighbours is doing the
dropdown's job, the clauses read as instructions rather than descriptions, and
the test pushed toward padding a line to keep it passing. Where two forms are
genuinely close, the group headers and the words themselves carry it.

**The vocabulary is asserted against §5's own table**, parsed out of DESIGN.md
at test time — group by group, so the test checks not merely that a form is
present but that it is filed where §5 files it. The parse is itself checked
(the six group names, the twelve MB.28 originals, the seventeen additions) so a
parse that matched nothing cannot make the comparisons vacuous. That is the
same tactic `categories.test.ts` uses on §6's table, for the same reason: a
transcribed copy is exactly what rots.

## The astrology vocabulary seed (MB.93)

`src/db/seed/astrology.ts` seeds DESIGN.md §5's planet and zodiac
table: nineteen `planets` and thirteen `zodiac_signs`, in §5's order, as the
`PLANETS` and `ZODIAC_SIGNS` literals. It takes the form seed's shape —
reference data rather than a scenario, `npm run db:seed:astrology` as a
third `scripts/db-seed.ts` target, run by `migrate.yml` in the same step as the
other two, idempotent by slug and ignoring `deleted_at`, updating nothing
already present, stamped by the bootstrap admin with the GUC published — with
`seedFlatVocabulary` in place of the two-tier helper, since there is no group
to insert first. `standard` seeds both inside its own transaction, and every
`planet` its compendium sets is a curated one; unlike `form`, no uncurated
planet is seeded, so the admin's to-do list is exercised by tests that write
one. §5's table is lower-case; the seed writes each name in title case
(`North Node`), and `astrology.test.ts` compares case-insensitively and
then checks every word's capital separately.

**A description is a gloss, not a correspondence list.** Each names the
body's or sign's other names, what it is and what it is read for — the Ram,
cardinal fire, courage and beginnings; the Moon's ascending node, what is
sought — because the suggestion query matches descriptions
(§5), so the words a reader reaches for have to be there: Lilith's carries
_Black Moon_, the nodes' _Rahu_ and _Ketu_, Ophiuchus's _Serpentarius_, and
the test asserts those four by name. Ophiuchus has no agreed modality or
element, so its themes carry it alone. A sign's description leaves out its
ruling planet, so typing `Mars` into `zodiac` does not offer Aries. As with the
forms, the descriptions are pairwise distinct within each table, and §5's
table is parsed at test time with the parse itself checked — two vocabularies,
nineteen and thirteen.

**Sources.** Researched when M4.5 settled the lists. The traditional seven and
their sign rulerships:

- [Lucky Mojo, "Planetary Rulerships of Herbs, Flowers, and Roots"](https://www.luckymojo.com/planetaryrulers.html)
- [Ancient Astrology, "The Planetary Rulerships of Plants"](https://www.ancientastrology.com/articles-/the-planetary-rulership-of-plants)

Herbs assigned to the outer planets in modern practice:

- [Alchemy Works, "Planetary Correspondences of Pluto"](https://www.alchemy-works.com/planets_pluto.html)
- [Anima Mundi Herbals, "The Astrology of Herbs"](https://animamundiherbals.com/blogs/blog/the-astrology-of-herbs)
- [Mystical Magical Herbs, "Herbs of the Solar System"](https://mysticalmagicalherbs.com/2013/10/26/herbs-of-the-solar-system/)

The asteroid goddesses (Ceres, Pallas, Juno, Vesta) and their rulerships:

- [Demetra George and Douglas Bloch, _Asteroid Goddesses_](https://www.goodreads.com/notes/20698760-asteroid-goddesses/7429292-erik?page=1)
- ["Reading astrological charts: Ceres, Pallas Athene, Vesta, Juno and Lilith"](https://www.booksie.com/509359-reading-astrological-charts-chapter-36)

Earth, Chiron, the lunar nodes and Ophiuchus are on the lists because practices
use them, not because a source above gives them herb correspondences: few
online sources do, and "few sources" is not a reason to refuse a practice.

## The standard scenario (M1.22)

`src/db/seed/standard.ts` implements DESIGN.md §"Seed data"'s second scenario:
five fixture users, workspaces W and X, and a populated compendium. It is the
fixture every authorization test reads against, which is why the cast is fixed
rather than generated — `asUser(A)` (M1.26, `tests/support/as-user.ts`, which
re-exports this module's own `FIXTURE_USERS`) has to mean the same person in
every suite, and an id a test can name beats one this run happened to produce.

| User | Id      | Role    | Where                 |
| ---- | ------- | ------- | --------------------- |
| A    | `…0003` | `user`  | owner of W            |
| B    | `…0004` | `user`  | member of W           |
| C    | `…0005` | `user`  | viewer in W           |
| D    | `…0006` | `user`  | member of unrelated X |
| E    | `…0007` | `admin` | no workspace at all   |

The ids continue the series `…0001` (the bootstrap admin, MB.5) and `…0002`
(`minimal`'s plain user) opened; W and X take `…0001-…0001` and `…0001-…0002`,
a block of their own so a stray id is never ambiguous about what it names.
Their slugs are not written down — `slugify(name)`, through the one shared
implementation, exactly as every other slug in the repo.

**E's absence from every workspace is the fixture, not an omission.** "A site
admin has no access to any workspace's ingredients or grimoire" (CLAUDE.md,
asserted by M6.6) is only assertable against an admin who is in none, and W and
X sharing no member is what makes a cross-workspace denial test say something.

**`canCreateWorkspace` follows the invite gate rather than convenience.** A–D
are seeded `true` because each is in a workspace, and under §5 that is how the
flag comes to be true — an invitation was accepted. E is seeded `false`: E has
never been invited, and creates workspaces by being an admin instead. Seeding E
`true` would erase exactly the distinction M6.7's gate turns on.

### The compendium is awkward on purpose

A clean list of herbs would exercise nothing the identity model exists for, so
the 26 entries carry §5's own hard cases:

- **Five rows labelled "Cat's Claw"** — _Uncaria tomentosa_, _U. guianensis_,
  _Senegalia greggii_, _Dolichandra unguis-cati_ and a claw from _Felis catus_
  — told apart only by the generated `canonicalKey`. Under uniqueness on
  `lower(name)` the compendium could have held one of them.
- **Two mineral varieties**, `Quartz var. amethyst` and `Gypsum var. selenite`,
  plus `Lapis lazuli` as a rock rather than a species.
- **A cultivar beside its species**: `Lavandula angustifolia 'Hidcote'` and
  `Lavandula angustifolia`, two entries because `canonicalName` is the most
  specific accepted name at the granularity the entry exists at.
- **Three `none` entries and one `unknown`.** No system names graveyard dirt,
  moon water or black salt; one does name Devil's Shoestring and nobody has
  looked it up, which is the row `where nomenclature = 'unknown'` returns as a
  curation to-do.
- **One uncurated form**, `rhizome` on Ginger — §5's own example of a value a
  member writes before an admin curates it, and the second bucket of M4.7a's
  suggestion list. The other fifteen in-use forms come from M4.3a's vocabulary.
- **Comfrey beside foxglove**, both `leaf`, both carrying safety notes: §5's
  argument for demanding a formal name in the curated tier is that those two
  are confused in the field.

M4.7/M4.7a (fuzzy duplicates, scoped suggestions) and M8.3/M8.3a
(local-beats-compendium resolution, folk-name promotion) resolve against these
rows. None of those tasks can be tested against tidy data, which is why the
mess is seeded rather than left for each test to build.

Entries also carry folk names (M4.4a's child table — "Uña de Gato" on both
_Uncaria_ rows, which is the ambiguity that table exists to hold) and category
assignments into §6's vocabulary.

### One transaction, three vocabularies

`standard` is "a populated compendium", and that is all of it: M4.3a's forms
and M4.3's categories as well as the ingredients. An assignment points at a
category by foreign key, so those rows have to exist first — which is why both
seeds land a task ahead of this one.

It seeds them **inside its own transaction** rather than calling
`seedCategories(db)` and `seedForms(db)`, which would open two more. Each of
those now splits into a public `seedX(db)` that opens a transaction and a
`seedXVocabulary(tx)` that assumes one — the GUC published and the bootstrap
admin present. A half-applied scenario (categories seeded, users not) is worse
than one that never ran, and three transactions is three chances at one.

`standard` itself takes that same shape since M1.23: `seedStandard(db)` opens
the transaction, publishes the GUC and inserts the bootstrap admin (the three
moves `beginSeedTransaction` makes), then hands over to
**`seedStandardContent(tx)`** — which is what `demo` calls, one level
up and for the same reason. Two of its internals are shared rather than copied
for the same argument: `categoryIdByName(tx)` moved into `categories.ts`, since
both scenarios file rows under §6's vocabulary by name, and `identityOf` is
exported, since `demo` keys W's own ingredients on the same three columns. That
key says nothing about which tier a row is in, so a caller builds its map from
one tier's rows rather than from both at once.

Idempotency is the category seed's, keyed on identity and **ignoring
`deleted_at`**: users and workspaces by their fixed ids, memberships by their
composite key, compendium entries by `(name, canonicalName, form)`, folk names
by ingredient plus `lower(name)`, assignments by their pair. Nothing already
present is updated, so a renamed workspace or a retitled entry survives a
reseed, and an entry an admin soft-deleted stays deleted rather than coming
back on the next run — asserted by test, since the partial unique indexes stop
only a second _live_ row and would let it through.

The entry key is `(name, canonicalName, form)` rather than `canonicalKey`
deliberately: those are the three columns §5's generated expression reads, and
recomputing that normalisation in TypeScript would be a second implementation
to keep in step — the one that lies is the one nobody runs.

## The demo scenario (M1.23)

`src/db/seed/demo.ts` implements DESIGN.md §"Seed data"'s third scenario:
`standard` plus spells in W's grimoire, with ingredients and layer order. It is
the scenario a screenshot is taken against, which is why the two jars are
written out the way a member would write them — an intent in a sentence,
instructions that read like instructions, a stack that names what went in and
in what order — rather than generated as "Spell 1" and "Spell 2".

| Spell              | Id      | Status     | Layers                                                                              |
| ------------------ | ------- | ---------- | ----------------------------------------------------------------------------------- |
| Hearth Warding Jar | `…0001` | `complete` | sea salt · black salt · hearth ash · **dust from the front step** · garden rosemary |
| Dreaming Sachet    | `…0002` | `draft`    | mugwort · lavender · house chamomile · amethyst                                     |

The ids are fixed and take a block of their own, `…0002-…`, after the users
(`…0000-…`) and the workspaces (`…0001-…`), so a stray id is never ambiguous
about what it names. A draft sits beside a finished spell because the status
badge (M10.20) has to have both to show, and one layer carries no quantity at
all — a sprig laid on top is not a measurement, and `quantity`/`unit` are
nullable precisely so it does not have to be one.

**Three things in it are fixtures rather than decoration:**

- **W's own ingredients**, the workspace tier of §5's one table: `Garden
Rosemary`, `Hearth Ash` and `House Chamomile`. A grimoire that only ever
  reached the compendium would exercise half of §5, and the jars mix the two
  the way a real one does.
- **Garden Rosemary shadows the compendium's Rosemary** — same formal name,
  same form, different tier, which the two partial unique indexes permit. That
  pair is exactly what M8.3's local-beats-compendium resolution collapses, and
  it can only be resolved where both rows exist.
- **One custom, one-off layer** (MB.40, story 57): "Dust from the front step",
  `form` `dust`, no `ingredient_id`, sitting between two linked layers in the
  same jar. It is never an `ingredients` row anywhere, and `dust` is nowhere in
  M4.3a's curated 78 — free text is what lets a member write it. Wave 13
  renders, reorders and prints both kinds of row, and this is its row of the
  second kind.

Layer order is the position in the `layers` array, never a number written
beside it: one list, so the stack and its depths cannot disagree, and each jar
is numbered from 1 — what M10.16's reorder rewrites and M10.9's read orders by.

### A jar's stack is seeded whole or not at all

Idempotency is `standard`'s — insert what is missing, keyed on identity,
ignoring `deleted_at` — for the spells (fixed id), W's ingredients
(`identityOf`, within the workspace tier) and the assigned categories (the
pair). **`spell_ingredients` is the exception: the unit keyed on is the spell,
not the layer.**

Every other seeded row stands on its own, so "insert what is missing" is well
defined per row. A layer does not — its identity is a depth in a sequence, and
the sequence is shared. Patch one row back into a stack a member has since
edited and the arithmetic is against you both ways: a layer pulled out of the
middle leaves the ones below it renumbered, so the depth the seed wants is
occupied by a different ingredient (the primary key) and the ingredient it
wants is already at another depth
(`spell_ingredients_spell_id_ingredient_id_unique`). Either collision fails the
whole scenario rather than the row.

So a jar that already has layers is left exactly as it is. What that gives up
is a demo jar healing itself after someone empties it by hand, which `make
db-reset` (M1.24) does properly anyway; what it buys is that a reseed over an
edited grimoire is a no-op rather than an error. Both halves are asserted in
`demo.test.ts` — the edited jar and the reordered one — and the assertions were
checked to fail without the rule.

## The provisional-account delete (MB.67)

`deleteProvisionalUsers(lifetimeSeconds, capSeconds)` is the one hard delete of a table
carrying `deleted_at`, and it is a named export rather than a loosening of
`write.delete`'s type. It removes every `users` row that is unverified,
holds at least one `accounts` row, and has an `updated_at` older than
`now()` minus the lifetime or a `created_at` older than `now()` minus the
cap. `accounts` and `sessions` follow by their
`ON DELETE CASCADE`. Both cutoffs are the database's clock, as the columns are. The `EXISTS` over `accounts` is `existsIn`'s, so the delete builds no read
of its own; `soft-delete-finder-guard.test.ts`'s pinned export list names this
function.

It is hard for a reason outside this layer: Better Auth reads `users` by
address with no `deleted_at` filter, so a tombstone would keep refusing the
owner's sign-in. It runs outside `withAudit` because there is no session and
no surviving row to stamp. Two partial indexes serve it, one per half of the `OR`:
`users_provisional_updated_at_idx` and `users_provisional_created_at_idx`,
each `WHERE email_verified = false`. The rest is [`auth.md`](auth.md), "Provisional accounts".

## Who may import the client (M1.17)

CLAUDE.md rule 2 — only `src/db/repository/` may import `db` — is enforced
by a `no-restricted-imports` entry in `.oxlintrc.json`. It bans every
relative shape `connection.ts` can be reached by (`./connection`,
`../connection`, `**/db/connection`, with or without the `.ts`), type-only imports included,
so a new importer fails `npm run lint` and the pr-gate lint job.

Exemptions are `// oxlint-disable-next-line no-restricted-imports` comments on
the import itself, not config: oxlint 1.82 **ignores** a rule set to `"off"`
or `"allow"` inside an `overrides` block, so a per-file exemption there would
look like it worked and silently do nothing. Six files carry one:

| File                                       | Why it needs a client, not a writer                                                                                                                                                                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/db/repository/write.ts`               | The choke point itself — the rule exists to protect it. `withAudit` opens the transaction every write runs in.                                                                                                                                                  |
| `src/db/repository/select.ts`              | The choke point again: `selectFrom`, the one read query builder.                                                                                                                                                                                                |
| `src/db/repository/provisional-users.ts`   | The choke point again: the one `users` hard delete, which runs outside `withAudit` (see "The provisional-account delete").                                                                                                                                      |
| `src/lib/auth.ts`                          | Better Auth's `drizzleAdapter(db, …)` takes the Drizzle client. It runs its own inserts through its adapter and database hooks (`claude-docs/auth.md`), so there is no session to hand `withAudit`; the user-create hook stamps `createdBy`/`updatedBy` itself. |
| `scripts/db-seed.ts`                       | The seed CLI constructs the handle it passes to `seed(db, …)`, which writes as the bootstrap user rather than through a session.                                                                                                                                |
| `tests/db/test-database-isolation.test.ts` | The connection _is_ the subject: it asserts `db` points at this worker's `sorrel_test_<n>` clone (M1.9).                                                                                                                                                        |

That list is pinned by `tests/guards/lint-db-client-boundary.test.ts`, which
lints deliberate violations written to a temp directory and asserts the exemption
set is exactly those six. Adding a seventh turns that test red, so it has to be
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
| Client ban (M1.17)              | Reaching `db` — and so a transaction, or an unaudited write — outside the repository and the three exempt files. |
| Query-builder ban (MB.33)       | Building any query at all outside the database layer, including one that would skip `deleted_at IS NULL`.        |
| `selectFrom` unexported (M1.20) | Reaching an unfiltered read from inside the repository.                                                          |
| Access boundary (M3.9)          | A resolver, page or component reaching the repository, or anything under `src/db`, without passing a service.    |

The access boundary is described in [`graphql.md`](graphql.md), "The access
boundary". Its second half, `server-only` on every service, stops a client
component from importing a service at all.

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
| pg_trgm's `%`, `<%` and `similarity()`                                                                                                                                                                                                                                                                 | No builder; the operators are what the trigram index answers ("Fuzzy matching")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| A function or expression: `lower(btrim(…))`, `unaccent_immutable(…)`, `greatest(…)`, `mode() within group (…)`, `json_agg(…) filter (…)`, `row_number() over (…)`, `now() - make_interval(…)`, `a \|\| ' ' \|\| b`, a `case`, a bare literal in a select list (`select 1`, the union's `0` and `null`) | No builder. The comparison _around_ one is still the builder's — ``ne(sql`btrim(…)`, '')``, ``lt(users.updatedAt, sql`now() - …`)`` — so a fragment holds the expression and nothing else                                                                                                                                                                                                                                                                                                                                                                                                                 |
| A row value and its casts: `(sort, id)` against `(cast(… as <the column's type>), …)`, `(…)::int`                                                                                                                                                                                                      | No builder for a row value, and the cast must be the column's own type ("Keyset pages"); the `>` and `<` are `gt`'s and `lt`'s                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `set_config(…, true)`                                                                                                                                                                                                                                                                                  | `SET LOCAL` with a bind parameter, which no builder issues (rule 3; "Fuzzy matching")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| A whole statement: the `union all` arms of a suggestion list, of `findSimilarIngredients`'s match or of `findCompendiumPage`'s search, a `Derived` source, the scalar subquery ranking a folk name, and the `not in (select …)` and `left join (select …)` inside them                                 | **Raw by rule, not for want of a builder.** Drizzle has `unionAll`, `.as()`, `.leftJoin()` and `notInArray(…, subquery)`, but each arm is a `.select(`, and the guard confines those to `select.ts`'s two builders. The arms' fields are the expressions above anyway, so building the frame would leave most of the tags where they are. The cost is the one `existsIn` closed for the four `EXISTS`: an arm's `notSoftDeleted` is by convention, inside a string the guard cannot read. Closing it means a third builder in `select.ts` that hands a union arm out filtered, argued for in its own task |

What is _not_ on the list, and was raw until MB.100: `… is null` where
`isNull()` serves, the compendium-tier predicate, now `inCompendium` in
`predicates.ts`, a correlated `exists (select 1 …)`, now `existsIn` ("Soft-delete
filtering"), and a comparison written into the string — `a > b`, `x <> ''`,
`id in (…)` — where `gt`, `ne` and `inArray` take a fragment on either side.
Those were raw by habit, or by the guard's old one-builder mechanism, not by
need. The schema files under `src/modules/*/schema/` are the other place the
`sql` tag appears — index predicates, `CHECK` expressions and column defaults —
and they are DDL, `drizzle-kit`'s input rather than a query, so this list does
not govern them.

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
