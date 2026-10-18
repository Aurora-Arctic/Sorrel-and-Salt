## `workspace_compendium_entries`, a compendium entry in a coven's cupboard (M12.13)

One row says "this coven's cupboard holds this compendium entry". It is the stated fact that M12.12's rule used to guess, by matching a coven's own ingredient to a compendium entry on name. The row carries the coven's own say over the entry too: seven columns that each read as the compendium's value while null.

| Column                                                   | Meaning                                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `id`                                                     | the row's own key                                                                                                    |
| `workspace_id`                                           | the coven whose cupboard holds the entry, required                                                                   |
| `ingredient_id`                                          | the entry held, required                                                                                             |
| `label`, `description`, `safety_notes`                   | the coven's own wording; null means the compendium's                                                                 |
| `elements`, `celestial_bodies`, `zodiac_signs`, `colors` | the coven's own lists, typed as `ingredients` types them; null means the compendium's, `[]` means cleared on purpose |
| `created_*`, `updated_*`, `deleted_*`                    | `...auditColumns`, with the `set_updated_at` trigger the migration adds                                              |

A null and an empty array are different answers, as `none` and `unknown` are for a nomenclature: null defers to the compendium, `[]` says the coven wants none shown.

### Why a table of its own

An `ingredients` row cannot be an override: `name`, `slug` and `nomenclature` are required, `identity_key` is generated from the name, and the label and slug uniques are per coven. A row made to fit would have to invent a name and a slug for something that is not a second ingredient. This row holds only the pair and the differences.

### Indexes

- A live partial unique on `(workspace_id, ingredient_id)`: a coven holds an entry once. After a soft delete the entry can be added again.
- A live partial unique on `(workspace_id, lower(label))` where `label` is set: one coven cannot call two entries by the same label, whatever the case. Two covens may share a label, and a null label reserves nothing. Whether a label also clashes with the coven's own ingredients is a service check in a later task, since the index sees only this table.
- A plain index on `ingredient_id`, for the curator's count of the covens holding an entry (M12.25).
- A trigram index on `unaccent_immutable(label)`, for the cupboard search (M12.18), the same fold `ingredients_unaccent_trgm` gives the compendium search.

### What the table does not enforce

That `ingredient_id` is a compendium entry (`workspace_id IS NULL` on the ingredient) is a service rule and a read filter (M12.14, M12.15), not a constraint: a CHECK cannot see another row, and no tier rule in the schema is a trigger. This task adds the table only; no finder, service or page reads it yet.

The repository's scoped writers accept it with no further marking, because they ask for the `workspaceId` and `ingredientId` columns by type. Its row type is `CupboardEntryRow`, and `tests/support/db/insert-cupboard-entry.ts` inserts one for a test.
