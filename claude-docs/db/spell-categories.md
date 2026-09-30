## `spell_categories` (M10.4)

Story 48's table: `spellId`, `categoryId`, + the four audit stamps, keyed on the
pair. `src/modules/grimoire/schema/spell-categories.ts`, migration `0015_wooden_zaran.sql`,
and the second of MB.34's two hard-deleted join tables.

**It holds the _assigned_ categories, and only those.** §9 and §12 make the
distinction and call conflating the two a bug: this table is what a member
declares the working is _for_, while a spell's **derived** categories are the
union of its ingredients' — read through `ingredient_categories` and stored
nowhere. M10.7 and M10.8 compare them, M10.17 renders the comparison, and that
comparison is the whole reason a stored intent is worth having rather than
inferable from contents. Nothing in the schema enforces the distinction, because
nothing can: the two are the same pair of columns pointing at the same
`categories` rows, and the difference is which table they came from.

- **The composite primary key is the assignment's identity**, as on
  `ingredient_categories`. No surrogate `id`: one would let the same category be
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
