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
- `drizzle-kit generate` cannot express DDL a task needs (the candidates are
  M4.1's two partial unique indexes and M4.6's `pg_trgm` gin index; note
  `0002_solid_marauders.sql` shows it already emits a partial unique index
  with its `WHERE` predicate correctly).
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
- **`owner` is a role here but not an invitable one.** That narrowing belongs
  to `workspace_invitations` (M7.1), whose check constraint rejects it;
  ownership is granted afterwards by an existing owner on the members page.
- Both tables carry the full six-column audit spread, and every `*_by` column
  references `users.id` as MB.5 specifies. The tables are inert at Wave 3 —
  nothing queries them until M6.3's service and its `Membership` proof land in
  Wave 5, which is the point of CLAUDE.md's table-task-then-behaviour-task
  rule.

## The ingredient identity model (MB.28, table M4.1)

DESIGN.md §5 specifies three tables that land in Wave 3: M4.1 creates
`ingredients` (the enums, columns, generated key, and CHECKs) — **merged**,
`src/db/schema/ingredients.ts`, migration `0005_uneven_bloodstorm.sql`; M4.1a
adds its three partial unique indexes, M4.2a creates `ingredient_forms`, and
M4.4a creates `ingredient_folk_names`. MB.28 recorded the model here first,
ahead of that DDL, so M4.1 was transcription rather than design — the same
reasoning as CLAUDE.md's table-then-behaviour rule, one step earlier:
cheapest to get right before anything depends on it. What follows describes
`ingredients` as built and the three tables still to come.

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
  §14).
- **`ingredient_folk_names`** — `id`, `ingredientId` (FK to `ingredients`),
  `name`, + audit. Common names, one row each, scoped to the ingredient that
  claims them.
- **`ingredient_forms`** — `id`, `name`, `slug`, `group`, `description`, +
  audit. Shaped like `categories`: global, admin-curated, no workspace
  scoping. This is the third resource admins curate globally, alongside the
  compendium and categories (CLAUDE.md).

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
constraints** — M4.1a, not yet built:

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
was never on the table regardless.

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

**Accent insensitivity is client-side only.** `unaccent` is not installed in
this database (only `pg_trgm` is, per the migrations section above), so
there's no server-side normalization path to lean on — a deliberate scope
limit, not a gap left for later.

Full column list, the CHECK constraints' exact text, and the
local-beats-compendium resolution query that reads these indexes: DESIGN.md
§5.

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

**The CI check (`destructive-ddl.yml` / `scripts/check-destructive-ddl.ts`,
M1.5)** scans migration files new or changed in a PR for `DROP COLUMN`,
`DROP TABLE`, `RENAME` (column or table), `ALTER COLUMN ... TYPE` (flagged
for review whenever present — telling narrowing apart from widening reliably
needs a real SQL parser and the column's previous definition, not just
regexes over the new migration's text), and a `NOT NULL` addition
(`SET NOT NULL`, or `ADD COLUMN ... NOT NULL` with no `DEFAULT`). It passes
automatically when none of those appear. When one does, the PR body must
contain a line of the exact form:

```
Destructive DDL acknowledged: <reason>
```

(case-insensitive, a non-empty reason required) — see the script's own header
comment for the regex and the reasoning. There's no such line format
elsewhere in the repo to stay consistent with; this is the one place it's
defined, so `claude-docs/ci.md` and the script both point back here.

## Audit columns and `applyAudit` (M1.15, FKs restored MB.5)

`src/db/audit.ts` exports `auditColumns` — the six-column object (`createdAt`,
`createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`) every table
spreads in as `...auditColumns`. `createdBy`/`updatedBy`/`deletedBy` carry
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
- `update` sets only `updatedAt`/`updatedBy`, leaving `createdAt`/`createdBy` absent from the returned payload so the `UPDATE` never touches them
- `delete` (soft delete) sets only `deletedAt`/`deletedBy`

Audit ids never come from the caller: `applyAudit` deletes any of the six
audit keys off the incoming payload before setting the ones the operation
calls for, so a payload smuggling `createdBy` from a request body is ignored
in favour of `session.userId`, per CLAUDE.md rule 3.

## The write path — `repository.ts` and `withAudit` (M1.16)

`src/db/repository.ts` is the only module that imports `db` from
`connection.ts` (CLAUDE.md rule 2, DESIGN.md §5), and it exports exactly one
thing: `withAudit(session, fn)`. `db` is not re-exported, and `fn` is not
handed the Drizzle transaction — it gets a narrow `AuditWriter` whose three
methods each run their payload through `applyAudit` first. That is what makes
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
  leaves the row in place (CLAUDE.md rule 4). There is no hard delete here.

`values` is typed as the table's insert model **minus** the six audit
columns, so a call site can't even name `createdBy` without a cast — and if
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
NULL` ANDed onto whatever `where` the caller supplied. The default, and
  normal-use, finder.
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
