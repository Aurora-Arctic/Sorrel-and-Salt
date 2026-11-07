## `spell_categories`

`spellId`, `categoryId`, + the four audit stamps, keyed on the pair
(`src/modules/grimoire/schema/spell-categories.ts`). It is one of the two
hard-deleted join tables ([`hard-delete-join-tables.md`](hard-delete-join-tables.md)).

**It holds the _assigned_ categories, and only those.** §9 and §12 call conflating
assigned and derived categories a bug: this table is what a member declares the
working is _for_, while a spell's **derived** categories are the union of its
ingredients', read through `ingredient_categories` and stored nowhere. The
comparison between them is the whole reason a stored intent is worth having
rather than inferable from contents. Nothing in the schema enforces the
distinction, because nothing can: the two are the same pair of columns pointing
at the same `categories` rows, and the difference is which table they came from.

- **The composite primary key is the assignment's identity**, with no surrogate
  `id`, for [`ingredient_categories`](categories.md)' reason. A duplicate is a
  `23505` naming `spell_categories_spell_id_category_id_pk`, whoever adds it: the
  stamps are only who touched it, so a second member toggling the same chip on is
  the same row.
- **Both sides are foreign keys** — `spell_categories_spell_id_spells_id_fk` and
  `spell_categories_category_id_categories_id_fk`. `categories` is referenced by
  **id**, unlike the free text `spells` uses for moon phase and wax colour: §5's
  rule is that a vocabulary a member writes is text and one only a keeper writes
  is a foreign key, and a link has no vocabulary question to ask. The test proves
  which table each key names: a real category id in the spell column is refused,
  and so is a real spell id in the category column, each naming its own
  constraint.
- **Indexed in both directions**, as `ingredient_categories` is: the primary key's
  index leads on `spell_id` ("what is this spell tagged for"), and the non-unique
  `spell_categories_category_id_idx` on `category_id`, with `spell_id` riding
  along, for "which spells are tagged for prosperity". The reverse index exists
  because the grimoire list is filterable by category; no feature lists spells by
  ingredient, so `spell_steps` has no reverse index.
- **No partial index**, for `ingredient_categories`' reason, and no CHECK
  constraints: between the key and the two foreign keys there is nothing about an
  assignment left to constrain.
- **No `workspace_id`**, since a spell's workspace is the spell's. That is also why
  this table cannot self-scope under CLAUDE.md rule 5, as `spell_steps` cannot:
  the service loads the parent spell under the `Membership` proof and derives
  scope from it, so a guard that infers the workspace-scoped set from a column name
  would silently exempt both tables.

**`NOT NULL` on the pair is redundant with the key, and kept anyway.** Both columns
are declared `.notNull()`, matching the other join tables, and Postgres 18 records
each as its own named constraint (`spell_categories_spell_id_not_null`). A primary
key column is implicitly non-null regardless, so stripping the declaration leaves
an insert omitting `spell_id` refused with the same `23502`. It stays because it
says what the column means, and `tests/db/schema-drift.test.ts` holds the
declaration to the catalogue's.

The other guards above were verified load-bearing: without the composite key the
same category is assigned to one spell twice, without the reverse index the
catalogue shows no non-unique index, and with the spell key repointed at
`categories` a live category id is accepted as a spell.
