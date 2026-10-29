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
  ["Ingredient slugs"](ingredient-slugs.md)), `canonicalName`, `nomenclature`, the generated `identityKey` (MB.216; below), the correspondence
  columns (`description`, `elements[]`, `celestialBodies[]`, `zodiacSigns[]`,
  `colors[]`, `safetyNotes`), `toxic` (M11.21; a yes/no, default no, and
  each form carries its own, which never unions with this one — DESIGN.md
  §5), `seedKey` (MB.241), + audit. `seedKey` is the
  key the compendium seed (MB.242) gives an entry it writes, so an entry an
  admin renames is not seeded again beside itself; it is null on every other
  row, the `standard` fixture's included (DESIGN.md §5, "`seedKey`"). `name` is the display label —
  what it's called here — and stays freely relabellable, because identity
  moved off it onto the formal name, `canonicalName` and its `nomenclature`.
  The row has no form: each form an ingredient comes in is a row of
  `ingredient_variants` beneath it (MB.216, below); the old model's `form`,
  `form_id` and `canonical_key` columns went in MB.223 (below). Of the
  correspondences only `elements` is constrained: a list of the `ingredient_element`
  `pgEnum` of `earth`, `air`, `fire`, `water`, `spirit`, closed and fixed —
  the exact opposite of a variant's `form`, and the reason the two are easy to confuse
  but never interchangeable. `celestialBodies`, `zodiacSigns` and
  `colors` are native `text[]` columns, one of the things SQLite could not
  have run (DESIGN.md §14). `celestialBodies`, `zodiacSigns` and `colors` replaced
  single columns in MB.136, and `elements[]` replaced the single `element`
  in MB.159 (both below); MB.160 dropped `element`. Substitutes were a `substitutes[]` column
  too, until MB.140 moved every reader and writer to `ingredient_substitutes`
  and MB.141 dropped it; `deities[]` moved to `ingredient_deities` the
  same way, MB.167 switching every reader and writer and ceasing to declare
  it, and MB.168 dropping it. Eight declared indexes: M4.1a's three partial unique ones, the identity pair
  on `identity_key` since MB.216 (below),
  MB.81's two on the slug ("Ingredient slugs"), MB.241's
  `ingredients_seed_key_unique` on live keyed rows, `ingredients_trgm`
  (M4.6), one multicolumn `gin_trgm_ops` index over `name` and
  `canonical_name` — see ["Fuzzy matching"](fuzzy-matching.md) — and its folded twin
  `ingredients_unaccent_trgm` (["The compendium read"](compendium-read.md)).
  The database holds two more until MB.107, MB.81's undeclared pending-claim
  indexes.
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
- **`ingredient_substitutes`** (MB.139, migration
  `0032_ingredient-substitutes.sql`; the model is MB.138's, in DESIGN.md §5) —
  `id`, `ingredientId`, `substituteId` (nullable FK to `ingredients`), `name`
  (nullable), + audit. One row per substitute, a link or a typed name: three
  CHECKs hold exactly one of the two, a non-blank name and no link to its own
  ingredient. Three indexes, all partial on `deleted_at IS NULL`: the
  parent's, and two unique ones, one link per ingredient and one name per
  ingredient case-folded, each over its own kind of row. None leads on
  `substitute_id`, since nothing reads back from a linked ingredient. The
  migration copies every `substitutes[]` entry across as a name, trimmed, with
  blanks skipped and an entry repeated in any case kept once, in the spelling
  it first holds. MB.140 moved every reader and writer to the table and
  stopped declaring the array. MB.141 dropped it after copying across, the
  same way, any entry with no row yet in any case, live or removed: by then
  the table was newer than the list.
- **`ingredient_deities`** (MB.165, migration
  `0040_picked-form-and-deities.sql`; the model is in DESIGN.md §5) — `id`,
  `ingredientId`, `deityId` (nullable FK to `deities`), `name`, `position`, +
  audit. One row per deity, in the order entered: a name on every row, and
  a link beside it when the member picked a curated deity. `name` is held on
  a linked row too, in the curated row's spelling, so a link whose deity is
  soft-deleted reads as its name under the ordinary filter, and a CHECK holds
  it non-blank. Three unique indexes, all partial on `deleted_at IS NULL`: one
  position per ingredient, which is also the parent's index, read in order;
  one link per ingredient and deity; and one unlinked name per ingredient,
  case-folded, so links to two same-named deities may sit on one ingredient.
  The full audit spread, as substitutes. MB.166's
  `0041_fill-ingredient-deities` filled it from `deities[]`, unlinked, in the
  array's order from position 0; MB.167 moved every reader and writer onto it
  (["Ingredient children"](ingredient-children.md)), and MB.168's
  `0048_drop-deities-list` copied across what the deploy before MB.167 had
  written to the list since, after each ingredient's rows, then dropped it
  ([`../design-decisions/mb.165-record-the-picked-vocabulary-row.md`](../design-decisions/mb.165-record-the-picked-vocabulary-row.md)).
- **`ingredient_forms`** — `id`, `name`, `slug`, `groupId`, `description`, +
  audit. Shaped like `categories`: global, admin-curated, no workspace
  scoping. This is the third resource admins curate globally, alongside the
  compendium and categories (CLAUDE.md). Its `groupId` points at
  `ingredient_form_groups`, admin-curated in turn — see the
  [categories section](categories.md), which settles both (MB.35).

**`nomenclature`** is a seven-value `pgEnum`, `NOT NULL` with no default:
`botanical`, `fungal`, `zoological`, `mineral`, `chemical`, `unknown`, `none`.
It names _which naming system_ a formal name belongs to, not which rank
within that system — `Quartz var. amethyst` and `Lapis lazuli` are both
`mineral` even though one is an IMA variety and the other a rock. `unknown`
and `none` are both answers, not the absence of one: `unknown` means a formal
name exists in some system but which one is not settled — the name may be
recorded, unconfirmed, or not yet looked up (§5 says why that earns a value
of its own, and MB.161 why it may carry the name); `none` is the
positive claim that no naming system names this thing at all (graveyard
dirt, moon water, black salt). A CHECK ties the kind to the name —
`nomenclature = 'unknown' OR (nomenclature = 'none') = (canonical_name IS NULL)`,
enforced in both directions, so `none` never carries a formal name and a
named kind never lacks one, while `unknown` takes either.

**`identity_key`**, the generated identity column (MB.216; below), is
DESIGN.md §5's `GENERATED ALWAYS AS (lower(coalesce(canonical_name, name)))
STORED`: the lower-cased formal name, or the label where there is none, and
never the form. Both functions in it, `lower` and `COALESCE`, are IMMUTABLE,
which Postgres requires of anything inside a generated column (the same
requirement applies to expression indexes).

Until MB.220 the identity was `canonical_key`, the same expression followed by
`::` and the trimmed, lower-cased `form` when one was set. Folding the form
into the key was what let _Valeriana officinalis_ root and leaf exist as two
separate identities, until MB.216 made them one entry with two variants
(below). It was also why the row's `form` lost its `pgEnum` early on: a cast
to an enum type raises an immutability question a plain `text` column does
not. MB.220 undeclared `canonical_key` and MB.223 dropped it, with the row's
`form` it read.

**Two CHECKs hold the table's names**:
`ingredients_nomenclature_declares_canonical_name` (the kind↔name CHECK above)
and `ingredients_canonical_name_not_blank`. The non-blank check exists because
`btrim(x) <> ''` is what the kind↔name CHECK cannot say for itself:
`canonical_name = '   '` satisfies "not null" while contributing nothing to
the identity key. A third, `ingredients_form_not_blank`, shipped with the
table and went with its column, undeclared in MB.222 and dropped in MB.223; a
variant's form has its own, `ingredient_variants_form_not_blank`. The expressions, and the
generated column's, are written as literal SQL rather than interpolated
Drizzle columns, and transcribe DESIGN.md §5's SQL verbatim. The generated
column has no choice — it names columns of the table whose column object is
still being built, so there is nothing to interpolate from. Postgres itself
would accept a table-qualified self-reference in either place (verified
against this database on 18.6); the limitation is Drizzle's.

**How the table is tested.** The worker's `sorrel_test_<n>` clone arrives
with every migration applied and the `standard` scenario seeded, re-cloned
that way before each test file (M1.27, `testing/where-tests-live.md`), so
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
constraints** — M4.1a, built from DESIGN.md §5's SQL, its identity pair
rebuilt on `identity_key` by MB.216 (below):
`ingredients_compendium_identity_key_unique` on `identity_key` in the
compendium tier, and `ingredients_workspace_identity_key_unique` on
`(workspace_id, identity_key)` and `ingredients_workspace_label_unique` on
`(workspace_id, lower(name))` in the workspace tier. M4.1a's own pair,
`ingredients_compendium_identity_unique` and
`ingredients_workspace_identity_unique` on `canonical_key`, went with that
column in MB.223. All three carry `WHERE deleted_at IS NULL`, per the [partial-index convention](soft-delete.md)
— deleting a row must not permanently reserve its identity or its
label (CLAUDE.md rule 4). The label index is workspace-tier only: inside one
workspace an ambiguous label is a mistake, but the compendium deliberately
allows several rows to display the same label (four unrelated "Cat's Claw"
entries) as long as they're different identities; the formal name that keeps
them apart is in the slug too (["Ingredient slugs"](ingredient-slugs.md)). They're indexes rather
than unique constraints because Drizzle's `nullsNotDistinct()` exists only
on constraints, and a constraint can't carry a `WHERE` predicate at all —
since every unique index in this schema must be partial, the constraint form
was never on the table regardless. Two indexes over the two tiers rather than
one over `(workspace_id, identity_key)` for the same reason: without
`NULLS NOT DISTINCT`, every compendium row's null `workspace_id` would be
distinct from every other's and the single index would reserve nothing there.

**The predicates are asserted by behaviour, once for every table.**
`tests/db/partial-unique-indexes.test.ts` reads each partial unique index
from the catalogue and proves a second live row refused and a soft-deleted
holder's slot freed, which is what catches a dropped `WHERE deleted_at IS
NULL`; `tests/db/schema-drift.test.ts` holds each index's name and
partiality to the schema file's. What stays in
`tests/modules/ingredients/schema/ingredients-indexes.test.ts` is what each
index refuses that the others do not: identity in the compendium, identity
and the folded label per workspace, and the slug per tier (MB.226).

**A variant's `form` is `text`, and deliberately not a foreign key to
`ingredient_forms`.** It was the ingredient row's own `form` until MB.222,
for the same reason. To a coven the curated table is an autofill vocabulary,
not a constraint: a foreign key would make an uncurated value like `rhizome`
unwritable until an admin curates it first. `ingredients-schema.test.ts`
asserts the ingredient's own foreign keys are its workspace and nothing else,
since that is the property the whole free-text design rests on. **A pick is
recorded beside the text** (MB.165): a variant's `form_id`, a nullable foreign
key to `ingredient_forms`, set only when a member picked a curated row, never
resolved from typed text. A variant's `form` is `NOT NULL`, so a pick always
stands beside its text and needs no CHECK of its own (the ingredient row's
`ingredients_form_id_has_form` held its `form_id` to a `form` until MB.222,
and went with both columns in MB.223). The pick is outside
`ingredient_variants_form_unique`, which folds the text, so two forms of one
ingredient, one picked as each Wax, still fold to one form, and a link to a
soft-deleted form reads as no link, the text staying. A save
writes a pick only of a curated form, live under a live group, beside text
folding to its name and written in its spelling; anything else is refused
beside the variant's `formId` or `form`, and a save sending no `formId` clears the column
and keeps the text (MB.167). The deities
take the same model in `ingredient_deities`, above, so a vocabulary a member
writes is text with an optional link to the curated row picked.

**The compendium tier is held to the vocabularies, by the service (MB.162).**
Each of a compendium entry's forms and each of its deities is a pick of a live
curated row — a form under a live group, a deity under a live tradition —
held or not, so a curated value typed rather than picked is refused as an
uncurated one is (MB.167, which moved the rule onto the pick). Its `celestialBodies`
and `zodiac_signs` each name one, matched as the suggestions fold,
`lower(btrim(value)) = lower(name)`. Every value is stored in its row's own
spelling. `createCompendiumEntry` and `updateCompendiumEntry` enforce it after
the parse, the picks through `resolvePicks` and the celestial bodies and signs through
`curatedSpellings` in `vocabulary`, and refuse a value as a `ValidationError`
at `['variants', i, 'form']` or `['variants', i, 'formId']`, or
`['celestialBodies', i]`, `['zodiacSigns', i]` or `['deities', i]` at the entry sent
([`../validation.md`](../validation.md), "The two ingredient variants"). Not
Zod, since the check reads the database, and not a key or a CHECK, since the
columns are shared with the coven tier, which keeps free text. Deleting a
curated row a live entry holds — a form or deity it picks, or a celestial body or
sign's last live spelling — is refused, and renaming one carries onto the
entries, so the rule holds after the write as well
([`../design-decisions/mb.162-compendium-holds-curated-values.md`](../design-decisions/mb.162-compendium-holds-curated-values.md)).
Since MB.220 a form rename is carried onto the entry's variants that picked
the form and moves no slug, a form being no part of the entry's identity or
address since MB.215.

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

**Planet, zodiac sign and colour become lists (MB.134).** DESIGN.md §5 gives
an ingredient several of each, so `planet`, `zodiac` and `color`, single
`text` columns as built, give way to `celestial_bodies`, `zodiac_signs` and `colors`,
nullable `text[]` with no default, declared in Drizzle as `celestialBodies`,
`zodiacSigns` and `colors`. They are stored as the retired `deities` list was:
the shared schema trims each entry, drops a blank one and turns a list left
empty into null
([`../validation.md`](../validation.md), "The two ingredient variants"), so no row holds `{}`
or a blank entry, and no CHECK repeats that. Since MB.167 it also refuses a
repeat but for case and spacing, at the repeat.
An array keeps its order, and each list's order is the member's, so nothing
sorts one on write or read.

- **Arrays, not child tables, unlike folk names.** Folk names moved to a
  table so a trigram index could reach them. No single column carried one —
  the celestial body and zodiac autofill reads the in-use values of the compendium
  and one workspace with no index behind them — so a list
  loses no index, and a table per list would buy three joins for nothing.
- **New names, by rule 10.** A column cannot turn from `text` to `text[]`
  under a deployed reader, so the lists sit beside the singles for a deploy:
  MB.135 added them and filled each from its single column where one was
  set (`0030_ingredient-lists`); MB.136 switched every reader and writer and
  stopped declaring the singles, which stayed in the database undeclared;
  MB.137 dropped them, with its `.ack.md` sidecar, once a release carrying
  MB.136 had reached production (`0036_drop-ingredient-singles`;
  ["Expand/contract"](expand-contract.md)).
- **MB.136's migration rederives the lists.** `0031_refill-ingredient-lists`
  runs before MB.136 promotes, while only 0030 has written a list, so every
  list is still its single's: each is set to its single as one entry, or to
  null where the single is, for whatever the live deploy wrote after 0030 — a
  new row, a changed value, a cleared one. Only a row that disagrees is
  written, so `updated_at` moves on no other. It is `generate --custom`,
  which copies the last snapshot rather than diffing the schema, so the
  snapshot keeps the undeclared singles and MB.137's `db:generate` still
  emits their drop.
- **MB.137's drop fills nothing first.** Once MB.136 promotes it writes the
  lists, so a single that disagrees with its list may hold the previous
  deploy's write between 0031 and the promotion, or the stale value of a list
  a member has edited since — and the row cannot say which. A fill would
  overwrite that member's edit to recover a write from a deploy-length
  window, one the app has not read since MB.136 went live, so the drop takes
  it (`0036_drop-ingredient-singles.ack.md`, "What is lost").
- **The in-use scan unnests.** Tier 2 of the celestial body and zodiac autofill
  reads entries rather than a column: `cross join lateral unnest(…)` gives
  one row per entry before anything trims or folds it, so a value counts
  once however many lists hold it, or however often one does
  (["The member's autofill"](member-autofill.md)). The deity autofill read
  `deities` the same way (MB.130) until MB.167 moved it onto
  `ingredient_deities`' live rows.

**Element becomes a list (MB.157).** DESIGN.md §5 gives an ingredient
several elements, so `element`, a single nullable `ingredient_element` column
as built, gives way to `elements`, a nullable `ingredient_element[]` with no
default, declared in Drizzle as `ingredientElement('elements').array()`. The
set stays the `pgEnum`'s five, so the array's type refuses anything else and
no CHECK says it again. The shared schema refuses a repeat and turns a list
left empty into null ([`../validation.md`](../validation.md), "The two
ingredient variants"), so no row holds `{}` or one element twice. No CHECK
repeats either: comparing an array's entries with each other needs a subquery
or a hand-written function, and the free-text lists carry no CHECK. The array
keeps the order chosen, and nothing sorts it.

- **A new name, by rule 10**, as MB.134's lists took one. MB.158 added
  `elements` and filled it from `element` where one was set, as a one-entry
  list (`0034_element-list`). MB.159 switched every reader and writer and
  stopped declaring `element`, and its migration, `0035_refill-element-list`,
  rederives the list from `element` for whatever the live deploy wrote after
  MB.158 — a new row, a changed value, a cleared one — as
  `0031_refill-ingredient-lists` did, writing only a row that disagrees.
  The seed writes lists since, two of its compendium entries more than one
  element. MB.160 drops `element` once MB.159 has deployed
  (`0037_drop-element`, with its `.ack.md` sidecar). The
  `ingredient_element` type stays, since the list is of it.
- **MB.160's drop fills nothing either**, for MB.137's reason: once MB.159
  promotes, a single that disagrees with its list may hold the old deploy's
  write between 0035 and the promotion, or the stale value of a list a
  member has edited since, and copying it in would bring back an element
  that member removed (`0037_drop-element.ack.md`, "What is lost").
- **The filter reads containment.** M8.13's element filter matches a row
  whose list holds the element chosen, among others or alone: Drizzle's
  `arrayContains`, `@>`, rather than an equality. No index stands behind it,
  as none stands behind any list; it ANDs onto the compendium read's other
  predicates over one tier.

**MB.215: identity moves onto the formal name alone, and each form becomes a variant.** DESIGN.md §5 now keys an ingredient on `identity_key`, `lower(coalesce(canonical_name, name))`, unique per tier, and holds each form it comes in as a row of `ingredient_variants` beneath it, one live row per ingredient and folded form, so Rosemary the herb and Rosemary the oil become one entry with two variants. A variant adds to its ingredient and never overrides it, and carries its own description, safety notes, correspondences, categories, substitutes and references, while deities and folk names stay on the ingredient ([`../design-decisions/mb.215-ingredient-variants.md`](../design-decisions/mb.215-ingredient-variants.md)). This file follows the model as each step lands: MB.216 added the table, filled one variant from each row's form and added `identity_key` with its two unique indexes beside `canonical_key`; MB.220 moved the identity finder, the collision mapping and the slug onto it; MB.222 stopped reading and writing `form` and `form_id` and undeclared them, with their two CHECKs, the pick's foreign key and `ingredients_compendium_form_id_idx`, without running `db:generate`, so the database kept them all, listed in `tests/db/schema-drift.test.ts`'s `PENDING_DROPS` with `droppedBy: 'MB.223'`; and MB.223 dropped `canonical_key`, `form`, `form_id`, their two CHECKs and the indexes over them, and gave this file its final wording. A variant's `form` stays text and not a foreign key, for the reason above: the curated vocabulary remains an autofill.

**Fuzzy matching: one index, and a rule every caller is bound by** has a file of its own: [`fuzzy-matching.md`](fuzzy-matching.md).

**Ingredient slugs** has a file of its own: [`ingredient-slugs.md`](ingredient-slugs.md).

**MB.216: the forms table and the identity key, as built.** One form of an
ingredient is a row of `ingredient_variants`
(`src/modules/ingredients/schema/ingredient-variants.ts`, migration
`0061_ingredient-variants.sql`): `ingredient_id`, `form` (text, non-blank by
`ingredient_variants_form_not_blank`), `form_id` (the curated pick, as
`ingredients.form_id` was), `description`, `safety_notes`, the four lists, and the six
audit columns, with its own `set_updated_at` trigger.
`ingredient_variants_form_unique` holds one live row per ingredient and
`lower(btrim(form))`, the fold `canonical_key` gave the form.
`ingredient_variants_id_ingredient_id_unique` on `(id, ingredient_id)` is the
one unique index on a soft-deleted table that is not partial: it is the target
of the composite foreign keys MB.217 adds, which a partial index cannot be, and
reserves nothing the primary key does not.
`tests/db/partial-unique-indexes.test.ts` names it as rule 4's exception and
fails any other. `ingredient_variants_form_id_idx` (partial) and
`ingredient_variants_unaccent_trgm` (a trigram index over the folded form and
description) serve MB.220's in-use reads and MB.218's search. Nothing reads or
writes the table yet but migration `0062`, the seeds and the test fixtures; it
is an ingredient's child, so the unscoped finders refuse it at compile time.

`ingredients.identity_key` is `GENERATED ALWAYS AS (lower(coalesce(canonical_name,
name))) STORED`, built by `identityKeyOf` (beside `canonicalKeyOf` until MB.220): the formal
name, or the label where there is none, and never the form.
`ingredients_compendium_identity_key_unique` and
`ingredients_workspace_identity_key_unique` hold it once per tier, the same
shape as the `canonical_key` pair, which MB.223 dropped. So since
`0062` _Valeriana officinalis_ root and leaf are no longer two entries in one
tier: they are one entry with two variants, and a write of the second as an
entry of its own is refused by the identity-key index, which the compendium
and coven services map since MB.220 (below).

**MB.220: identity is the formal name alone, as built.** `identity_key` is
the key every reader and writer uses. `findCompendiumEntryByIdentity({ name,
canonicalName })` and its coven twin, `findWorkspaceIngredientByIdentity`
under the proof, compare it through `identityKeyOf`, and `IngredientIdentity`
carries no form. Both services' `refuseCollision` map the identity-key
indexes to `canonicalName`, or to `name` for an entry with no formal name,
naming the entry already holding it through `describeEntry` and pointing at
adding the form to it. Postgres names the first index it finds broken, and
the address index and a coven's label index are older than the identity one,
so an oil written under the herb's own label meets one of them first: each
of those branches looks for an identity holder before its own message, so
the refusal is the formal name's whichever index spoke.

`canonical_key`, `canonicalKeyOf` and the two indexes over the column
left `ingredients.ts`, and `db:generate` was not run: it would have emitted
the drop that was MB.223's. The database kept the three until then, listed in
`tests/db/schema-drift.test.ts`'s `PENDING_DROPS` with `droppedBy:
'MB.223'`; they refused nothing `identity_key`'s indexes did not, and the
services mapped their names too, since Postgres might report either, until
MB.223 dropped them.

`0062_ingredient-variants-fill.sql` fills one variant per row with a form,
soft-deleted rows included: the trimmed form and its pick, stamped as the
row's last editor. The correspondences stay on the ingredient, since a variant
adds to its ingredient and never overrides it. A `DO` block then refuses a
database holding two live rows of one `identity_key` in a tier, with a hint
naming "Merging a group" in
[`mb.215-ingredient-variants.md`](../design-decisions/mb.215-ingredient-variants.md),
before the two indexes are created. Run the pre-flight query before
deploying it; it must return no row:
`select workspace_id, lower(coalesce(canonical_name, name)), count(*) from
ingredients where deleted_at is null group by 1, 2 having count(*) > 1`.
The migration's data tests retired once `0062` reached production's journal
(claude-docs/testing/layer-ownership.md, "What a test may assert", rule 7;
M14.27). Its fill tests had already retired with MB.223, which dropped the
`form` column the fill reads, so no migrated database can run the fill again.

**MB.217: what names a variant, as built.** Migration `0063_variant-children.sql`
gives four tables a `variant_id` held to their `ingredient_id` by a composite
foreign key, `(variant_id, ingredient_id) → ingredient_variants (id,
ingredient_id)`, declared with Drizzle's `foreignKey` against MB.216's
non-partial `(id, ingredient_id)` index, so no row pairs one ingredient with
another's form. The key is `MATCH SIMPLE`, which skips the check when either
column is null, so a CHECK closes the gap wherever the ingredient may be null.

- `inventory_items.variant_id`, NOT NULL; one live row per coven and variant.
- `spell_ingredients.variant_id`, set exactly when `ingredient_id` is; one
  live layer per jar and variant. `0063` filled every linked layer from its
  ingredient's one live variant, behind a guard refusing a database where one
  has none or several.
- `ingredient_categories.variant_id`, nullable: the pair primary key became
  two unique indexes, one on the parent's pairs and one on a form's
  ([`ingredient_categories`](ingredient-categories.md)).
- `ingredient_substitutes.variant_id`, the form a row stands in for, and
  `substitute_variant_id`, the linked ingredient's form, under its own
  composite key against `substitute_id` and a CHECK that it has one beside
  it. `ingredient_substitutes_not_itself` narrowed to the same ingredient
  _and_ the same form, so a sibling form may stand in, and the link and name
  uniqueness split by whether `variant_id` is set.
- `reference_links.ingredient_variant_id`, one entry in the `SOURCED` registry
  ([References](references.md)).

The stock service writes `variant_id` on stock (M9.3, over the wire M9.4);
nothing writes it on layers but the demo seed and the test fixtures (the
grimoire tasks); MB.219 writes a form's
categories, substitutes and references. `tests/db/migrations/0063-variant-children.test.ts`
re-runs the fill and the guard, and retires once `0063` is in production's
journal (claude-docs/testing/layer-ownership.md, "What a test may assert",
rule 7).

**MB.223: the old model dropped, as built.** Migration
`0064_drop-form-and-canonical-key.sql` drops what MB.220 and MB.222 stopped
declaring: the indexes `ingredients_compendium_identity_unique`,
`ingredients_workspace_identity_unique` and
`ingredients_compendium_form_id_idx`; the CHECKs `ingredients_form_not_blank`
and `ingredients_form_id_has_form` and the pick's foreign key
`ingredients_form_id_ingredient_forms_id_fk`; and the columns
`canonical_key`, `form` and `form_id`. `canonical_key` is dropped before
`form`, the reverse of the order `db:generate` wrote, since Postgres refuses
to drop a column a generated column reads. Nothing is lost: every form has
been a variant since `0062` (`0064_drop-form-and-canonical-key.ack.md`). The
drift test's `PENDING_DROPS` is empty again, both services' `refuseCollision`
map the identity-key indexes alone, and `ingredientSlug` takes the label and
the formal name.

## Ingredient table details

Notes that used to sit as comments on `src/modules/ingredients/schema/ingredients.ts`.

- **Identity key.** `identityKey` is the formal name, falling back to the label, and never the form. The generated column's expression and the finder's comparison come from one builder, so the key has one spelling. The column names are raw because they name columns of the table still being built; every function in the key is IMMUTABLE and no enum cast is involved, which is what makes a stored generated column legal. The text is the migrations' own, byte for byte, so `db:generate` sees no change. GENERATED ALWAYS means Postgres refuses a direct write, and Drizzle omits generated columns from `$inferInsert`, so TypeScript refuses first.
- **Slug.** The public address is `ingredientSlug` of the label and the formal name (src/lib/slugify.ts), with no form. It has no default: one in SQL would be a second slug rule, so a row written earlier keeps its form in the slug until its next save.
- **Nomenclature.** The database has no default: the workspace-local Zod variant supplies `none` and the compendium variant makes the admin answer. The CHECK has three cases: `none` carries no formal name, a named kind must, and `unknown` takes either. Zod enforces it too, so the CHECK is never what a user sees. A second CHECK stops a blank formal name keying nothing.
- **Toxic flag.** The ingredient's flag is its own and is never read into a form or out of one; each form carries its own (DESIGN.md §5, "The toxic flag is the one exception").
- **Seed hash.** `seedHash` is the sha256 of the seeded fields of the markdown file the entry was last written from, so the seed can tell a changed file from an unchanged one and apply a correction. Null until the seed writes it, and always null on a coven's own entry. It is not a stamp: the trigger leaves `updated_at` alone when only this changes (migration 0081). A hash is 64 lower-case hex characters or nothing, because a truncated or upper-cased one would never equal a file's and would queue a correction forever.
- **Review mark.** `reviewedAt` and `reviewedBy` are set together or both null, since one without the other says nothing a reader can trust. A reviewed entry is one the seed never overwrites. Only the review service writes them, and like the hash they are never a change to the content, so the trigger ignores both.
- **Seed key.** `seedKey` is the key the compendium seed gives the entry it writes, so an entry an admin renames is not seeded again beside itself. The `standard` fixture keys on identity and writes none.
- **Indexes.** The formal name is unique once per tier whatever the form, as two indexes: a constraint carries no WHERE and `nullsNotDistinct()` exists only on constraints. Label uniqueness is the workspace tier only: inside one drawer an ambiguous label is a mistake, in the compendium it is the point. The slug index for the workspace tier carries no tier predicate, as DESIGN.md §5 writes it, because a null `workspace_id` collides with nothing in a btree.
- **Trigram indexes.** One multicolumn `gin_trgm_ops` index serves a predicate on either column alone (asserted by EXPLAIN in ingredients-trigram.test.ts). It is not partial. A match must be written `name % $1` under a per-transaction `pg_trgm.similarity_threshold`, never `similarity(name, $1) > 0.4`, which no trigram index can answer. The folded twin goes through `unaccent_immutable` (migration 0026) for the compendium search's accent-insensitive `<%`; only an expression index lets a fold reach a trigram index. It sits beside the raw one because the fuzzy finders still match the raw columns.
