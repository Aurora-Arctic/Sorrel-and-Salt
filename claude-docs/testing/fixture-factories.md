## Fixture factories (M1.25)

**`tests/support/fixtures/`** is `makeIngredient`, `makeSpell` and
`makeWorkspace` — plain objects with sensible defaults, so a test states the
one thing it is about and the factory answers the rest:

```ts
makeIngredient({ categories: ['Protection'] });
makeSpell({ layers: [{ ingredientId: mugwort }] });
makeWorkspace({ name: 'Fixture Coven Two' });
```

**They are objects, not inserts.** Nothing here opens a connection, which is
what lets the `unit` project test them with no Postgres in sight and leaves
the inserting to the caller — or, for an ingredient, to the shared inserter
below. Each fixture is typed
against its table's own `$inferInsert` — the same idiom `src/db/seed`'s types
use — so a column renamed in a module's `schema/` is a compile error in every
fixture that names it. The schema import is `import type`: a runtime import of
the schema is a runtime import of drizzle-orm, and `tests/support/` is not
among the paths allowed to make one (CLAUDE.md rule 4 / MB.33).

**Setup rows bypass the writer** (MB.101; the rule is CLAUDE.md's Testing
section, its long form `.claude/rules/testing.md`). Setup must not depend on
the code under test, and the writer refuses
states setup regularly needs — an already-deleted row, an un-delete, a
backdated stamp, a Better Auth row — while a compendium ingredient is written
through `withAudit` only by `insertInCompendium` under the `SiteAdmin` proof,
which is the compendium service's own write and so the code under test
wherever the compendium is
([`db/site-admin-proof.md`](../db/site-admin-proof.md), "The SiteAdmin proof").
The seed is the one sanctioned writer outside `withAudit` (CLAUDE.md rule 3),
and a test inserter is the same kind of thing, so it does what the seed does.
[`tests/support/db/insert-ingredient.ts`](../../tests/support/db/insert-ingredient.ts)'s
`insertIngredient(sql, fixture, author)` writes an `IngredientFixture`'s row,
its folk names and its category links in one transaction, stamps every row's
`created_by`/`updated_by` from `author`, and publishes `app.current_user_id`
inside the transaction, so a v2 history trigger would record the author
rather than nothing; category names are resolved through the seeded
`categories`, and a name with no live row is a thrown error naming it, never a
silent skip. Every ingredient-family service, loader and GraphQL test seeds
through it, and a test that needs a spell seeds through
`tests/support/db/insert-spell.ts`'s `insertSpell`, which does the same for a
spell, its layers and its categories — each keeping at most a one-line adapter from what the file states to a
fixture. Two kinds of raw insert stay, on purpose: a schema test's, which is
its subject, and the volume loads in
`tests/modules/ingredients/services/*-plan.test.ts` — tens of thousands of
`generate_series` rows that are the planner's ballast rather than fixtures,
and no business of a row-at-a-time inserter.

**Default names are invented, never real.** M1.27 seeds the `standard`
scenario into the template every `db` worker clones, and the
partial unique indexes reserve each seeded identity — so a default that
matched one would be a fixture no test could insert. A real ingredient merely
absent from the seed today is only safe until someone seeds it, so the
defaults are names that cannot be seeded: `makeIngredient()` is Testwort /
_Fixtura testalis_, every formal name the nomenclature table supplies is of
the same kind, `makeSpell()`'s default custom layer is Fixture Ash, and
`makeWorkspace()` is Fixture Coven. A fixture is what a test writes _beside_
the seeded world, so the rule binds a factory's own defaults and not a name a
test states (`.claude/rules/testing.md`, "Fixtures"). `makeSpell()` still lands in W — `workspaceId` is a reference,
not an insert, and a fixture spell and a seeded spell belong in the same
coven. `ingredient.test.ts` and `workspace.test.ts` also check the defaults
against `COMPENDIUM_INGREDIENTS` and `FIXTURE_WORKSPACES`, read from
`src/db/seed/standard` rather than copied — a backstop rather than the
mechanism.

### Overrides merge; arrays replace

`mergeFixture` applies an override as a sentence about the default rather than
as a replacement for it — a nested object merges key by key, and a field the
override does not mention keeps its default. Three decisions make that useful:

- **An array replaces wholesale.** `makeIngredient({ categories: ['Protection'] })`
  is filed under protection and nothing else. Merging element by element would
  leave the default's other entries behind and the test would be about
  categories it never named.
- **`undefined` says nothing; `null` says null.** `undefined` is what an absent
  optional property reads as, so treating it as a value would let
  `{ form: maybeForm }` erase a default whenever the caller's own variable
  happened to be unset.
- **Every call gets its own copy.** The defaults are cloned before anything is
  written into them, so a test that pushes a category onto one fixture is not
  editing the next test's — the hazard `asUser` returns a fresh session to
  avoid.

There is no `deepmerge` dependency: those three rules are the whole library,
and the one that matters most is the one a general-purpose merge is least
likely to agree with us about.

### The fields that have to agree with each other

This is what the factories are actually for. Several of §5's tables bind two
columns together with a CHECK, and a factory that merged a partial override
into its defaults would hand back a row Postgres refuses — failing a test for
a reason it was never about.

- **`makeIngredient` derives `canonicalName` from `nomenclature`.**
  `ingredients_nomenclature_declares_canonical_name` ties the two, so
  `{ nomenclature: 'none' }` drops the formal name and `{ nomenclature:
'mineral' }` supplies one. Every one of §5's seven kinds has an answer.
- **`makeSpell` derives a layer's shape from whether it names an ingredient.**
  A layer points at an ingredient _or_ names one of its own
  (`num_nonnulls(ingredient_id, name) = 1`, MB.40), with `form` allowed only
  beside a name, so `{ ingredientId: … }` clears both. Defaulted layers take
  distinct names, because `spell_ingredients_spell_id_custom_name_unique`
  folds `Salt` onto `salt` within one jar; `layerOrder` is the position in the
  array, 1-based, so the two cannot disagree.
- **`makeWorkspace` derives the slug from the name**, through
  `src/lib/slugify` — CLAUDE.md's slug rule, and a fixture is exactly where a
  second spelling would get written down.

**Derivation stops the moment the caller states the field**, including when
they state it as `null`. That is how a test writes the row a constraint exists
to reject: `makeIngredient({ nomenclature: 'none', canonicalName: 'Artemisia
vulgaris' })` is the CHECK's own counterexample, and it has to stay writable.

### `…Columns` for the raw-SQL tests

The db tests talk to Postgres through `postgres` directly, so they insert by
column name rather than by field. `ingredientColumns`, `spellColumns`,
`spellLayerColumns` and `workspaceColumns` translate, dropping what belongs to
another table — an ingredient's folk names and categories, a spell's
categories and layers, a workspace's members. `ingredientColumns` also adds
the ingredient's `slug`, derived from its label, form and formal name through
`ingredientSlug` exactly as the seed derives it, so a raw insert satisfies the
column's `NOT NULL` without a test writing a slug down beside a name.

They carry **no audit columns**: the stamps come from the session and never
from a fixture (CLAUDE.md rule 3), so a raw-SQL test spreads its own author
beside them:

```ts
insert into ingredients ${sql({ ...ingredientColumns(makeIngredient(overrides)), created_by: AUTHOR, updated_by: AUTHOR })}
```

That spread is what a schema test writes by hand. For an ingredient a test is
not testing the writing of, it is `insertIngredient`'s (above), which spreads
the author over the row and its children alike.

The camelCase→snake_case mapping is a string transform rather than a read of
Drizzle's column metadata, which would be the obvious source of truth:
`getTableColumns` is a runtime drizzle-orm import, and `tests/support/` may not
make one.

### Who uses them

`tests/modules/ingredients/schema/ingredients-schema.test.ts` and `…/ingredients-indexes.test.ts`
were carrying byte-identical copies of the same untyped `row()` helper, which
is where a partial identity would have gone on quietly disagreeing between the
two; both now build through `makeIngredient`. `tests/modules/grimoire/schema/spells-schema.test.ts`
records through `makeSpell` — dropping `status` from the insert, so the
column's own default is still what "defaults a new spell to draft" observes —
and `tests/db/updated-at-trigger.test.ts` writes its workspace through
`makeWorkspace`, which is what took the hand-written `'hearth'` slug out of
that file.
