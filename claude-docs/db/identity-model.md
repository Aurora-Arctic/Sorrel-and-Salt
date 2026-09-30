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

**Fuzzy matching: one index, and a rule every caller is bound by** has a file of its own: [`fuzzy-matching.md`](fuzzy-matching.md).

**Ingredient slugs** has a file of its own: [`ingredient-slugs.md`](ingredient-slugs.md).
