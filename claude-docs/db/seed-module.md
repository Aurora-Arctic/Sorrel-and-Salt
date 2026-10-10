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
transaction, the actor published first by the same `publishActor` — all
four settings, `app.current_user_id` the bootstrap user's and the other
three empty (M1.19, MB.208) — every stamp produced by the shared
`applyAudit`. The seed cannot hold any other handle — `src/db/seed/` is not
among the six files allowed to import `connection.ts` — which is what makes
the handle honest. The reasoning, and the alternatives it rules out, are in
[`design-decisions/m1.21-seed-writes-through-its-handle.md`](../design-decisions/m1.21-seed-writes-through-its-handle.md).

**Import order is not load-bearing anywhere.** There is no cycle between
`audit.ts` and `users.ts` any more (MB.86): `audit.ts` exports factories that
take the referenced column and depends on nothing in a module, and the
`auditColumns` instance lives with `users` because every stamp references it.
So a seed module, the repository and drizzle-kit — which globs
`src/modules/*/schema/*.ts` and may enter the module graph at any schema file
— all see a fully built `users` whichever import comes first.

**Two helper modules carry what every seed repeats** (MB.51).
`src/db/seed/idempotent.ts` carries the moves. `beginSeedTransaction(db,
body)` opens the one transaction, publishes the actor through
`withAudit`'s own `publishActor`, inserts the bootstrap user and then runs
`body(tx)`; every entry point — `seedMinimal`, `seedStandard`, `seedDemo`,
`seedCategories`, `seedForms` — is that call. `insertMissing(tx, table, wanted,
{ existing, keyOf, toRow })` inserts each `wanted` whose key `existing` did not
return, stamped by the bootstrap user through `applyAudit`, and updates
nothing; the vocabularies call it with `presentKeys`, whose present is a seed
key or a live slug. Every other site calls `insertMissingBy(tx, table, wanted,
{ columns, fold?, where?, toRow })` (MB.208), which builds the key once and
reads it off both sides: the table's rows under `columns`, and each `wanted`
under the same property names, a part compared through `fold` where the
unique index folds it (a folk name's `lower()`) and null and absent one empty
part. A one-column key reads only the wanted values — the fixture ids, the
demo's spells and jars — and a wider one the table, narrowed by `where` where
the site scopes it: W's ingredients by `workspace_id`, `standard`'s deity
picks by `deleted_at` when it restores them. Each ignores `deleted_at` unless
its `where` reads it, which is where that choice can be read.
`insertMissingReturningIds(tx, table, wanted, present, { keyOf, keyOfRow,
toRow })` is the same insert for the two callers that link what they insert —
`standard`'s compendium entries and the sources seed's references — and
returns `present` with each inserted row's id under its key; `present` is the
caller's own read, since each decides what present means.
`requireFrom(map, key, describe)` is a `Map` lookup that throws
`describe()`'s message rather than handing `undefined` to a NOT NULL column.
`insertSeedUser(tx, user)`, in `bootstrap-admin.ts`, inserts a user by fixed
id as the bootstrap user, the bootstrap user itself and `minimal`'s alike.
`src/db/seed/two-tier-vocabulary.ts` exports `seedTwoTierVocabulary(tx, {
vocabulary, groups, items, groupOf, itemNoun, slugOf? })` — groups, then the
items filed under them, each by seed key — which `seedCategoryVocabulary`,
`seedFormVocabulary` and `seedDeityVocabulary` call with their own
`TWO_TIER` entry and literals. The literals (`CATEGORY_GROUPS`,
`CATEGORIES`, `FORM_GROUPS`, `FORMS`, `DEITY_TRADITIONS`, `DEITIES`) stay
in `categories.ts`, `forms.ts` and `deities.ts`, where the tests comparing
them against their documents import them from — bar `CATEGORY_GROUPS`, in
`category-groups.ts` beside them so the workshop can import it without the
seed (MB.36). The tables, and the item's key to its group, are the
vocabulary's entry in `TWO_TIER` (`src/db/vocabularies.ts`, MB.208), the one
list the repository's `groupingOf` reads too, so the seed writes the found id
under `groupId` or a deity's `traditionId` without each caller saying so.
Each caller says only how an item names its group, since deities differ
(MB.129): `groupOf` reads the group's name off an item (`category.group`,
`deity.tradition`). A form's and a deity's slug carries its group's name
(M5.6a, MB.132), so those two pass `slugOf(name, groupName)`, and with it
given the same call re-derives every live item's slug and writes it where it
differs — the backfill `reslugItems` was a second call for until MB.208.
`src/db/seed/flat-vocabulary.ts` exports `seedFlatVocabulary(tx, table,
items)`, the one-tier counterpart for a vocabulary with no group — each item
by seed key, the same rules — which `seedAstrologyVocabularies` calls once
for `planets` and once for `zodiac_signs`, the two tables `FLAT` lists.

**Seed keys (MB.171).** Every table the reference data writes — the eight
vocabularies and `references` — carries `seed_key`, the identity the seed
gave a row when it inserted it: a vocabulary row's slug at insert, a
reference's rendered citation. It is never changed after, and null on a row
an admin or a member wrote, under a partial unique index on live keyed rows.
Keyed by the slug alone, a reseed after an admin renamed a row would not
recognise it, since the slug follows the name, and would put the original
back beside it; a reference's citation follows every field the same way.
`0045_seed-keys` backfilled each row the bootstrap user created with its
slug, exact because no rename writer had shipped. Nothing outside
`src/db/seed/` writes the column, and no input, service or GraphQL field
names it. The two helpers above key on it from MB.172: `presentKeys` takes a
row as present by its key, live or soft-deleted, or by a live row's slug, so
an admin's own row under a seed name is not met by a second the slug index
would refuse; each row they insert carries its key; and an item finds its
group by the group's key, so a renamed group still takes it.
`0047_refill-seed-keys` keys any bootstrap-created row still unkeyed, one
seeded between the two deploys. The sources seed keys on it from MB.156 ([`mb.171-seed-keys.md`](../design-decisions/mb.171-seed-keys.md)).

**`minimal`** (`src/db/seed/minimal.ts`): one system user, one user, empty
compendium. The system user is the bootstrap user under the fixed
`BOOTSTRAP_USER_ID` (`…0001`, MB.5), inserted as its own
`created_by`/`updated_by` in a single self-satisfying statement — that insert
lives in `src/db/seed/bootstrap-admin.ts` since M4.3, because every seeded row
needs a creator and the category seed runs without `minimal` having gone
first. It is `role: 'user'`, not an admin, since MB.58: it has no OAuth
account and is unverified, so Better Auth refuses to link a sign-in to it and
nobody can sign in as it (`tests/db/account-linking.test.ts` pins the refusal;
[`m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md)), so an
admin role on it would grant nothing to anyone. `/admin/users` leaves it out
(MB.52). The file and its exports keep their old names, since `deploy.yml` lists the file.
The plain
user is `MINIMAL_USER_ID` (`…0002`), created by the bootstrap user. Both
keep `canCreateWorkspace` false — a bare install has granted nothing. It is
**idempotent by fixed id** (`ON CONFLICT (id) DO NOTHING`), not by
truncating: a re-run adds nothing, and nothing is dropped — the reset that
drops is M1.24's. [`standard`](standard-scenario.md) is M1.22's and [`demo`](demo-scenario.md)
M1.23's.
