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

That `ingredient_id` is a compendium entry (`workspace_id IS NULL` on the ingredient) is a service rule and a read filter (M12.14, M12.15), not a constraint: a CHECK cannot see another row, and no tier rule in the schema is a trigger. M12.14 adds the reads below; writing a row is a later task's (M12.15).

The repository's scoped writers accept it with no further marking, because they ask for the `workspaceId` and `ingredientId` columns by type. Its row type is `CupboardEntryRow`, and `tests/support/db/insert-cupboard-entry.ts` inserts one for a test.

### Reading it

M12.14 adds the reads, in `src/db/repository/cupboard-entries.ts` and the `ingredients` service `services/cupboard-entries.ts`.

- **`findCupboardEntry(membership, ingredientId)`** and **`findCupboardEntriesOf(membership, ingredientIds)`** read the proof's coven's live rows, one or a batch. Each ANDs the proof's `workspace_id` and the row's tombstone filter, and keeps a row only while it names a live compendium entry: the private `inCupboard` filter checks the ingredient exists under `workspace_id IS NULL`. So a row naming a coven's own ingredient is never returned, which is the read filter half of the tier rule above, and neither is the row of an entry the compendium has deleted, which only the escape hatch below reads (M12.24).
- **`findCompendiumMatchesByName(name)`** answers the live compendium entries whose name or formal name is `name`, exactly but for case. It takes no proof, because the compendium is public. Later tasks read it for the add flow's question when the compendium already has a typed name (M12.20), and for a coven's own entry's "In the Compendium" block (M12.22).

The service reads the row for a member, viewers included, under `{ ingredient: ['read'] }`: `getCupboardEntry` one at a time, and `cupboardEntriesOf` as `Ingredient.cupboardEntry`'s batch, one read per coven named, with a `Forbidden` in a refused coven's slots as `stockOf` answers. A coven's entry page reads the row through `ingredientDetailOf(session, entry, workspaceId)`, whose `cupboardEntry` is null on the public page, which names no coven.

**`applyCupboardEntry(row, entry)`** lays a row over its compendium entry, column by column as `entry?.x ?? row.x`, the label over the name. It uses `??` and never `||`, so an empty list stays cleared rather than falling back to the compendium's. Forms, folk names, substitutes, categories, references and `toxic` have no override and always read from the compendium, and the id and the tier stay the compendium's, so `isGlobal` stays true for a compendium entry. Over GraphQL the row is answered beside the entry rather than merged into it ([`graphql/schema.md`](../graphql/schema.md), "Cupboard entries").

`tests/db/repository/cupboard-entries.test.ts` holds the finders' rules, each case seeding the row a read must leave out beside the one it must return, and `tests/modules/ingredients/services/cupboard-entries.test.ts` holds the merge, per column for null, set and `[]`.

### Counting covens

M12.25 adds **`countCovensUsing(curator, ingredientId)`** to `cupboard-entries.ts`. It answers how many distinct live covens have a live row naming the entry, as one `count(distinct workspace_id)`. It is unscoped by design: it takes the `Curator` proof where the other finders take a `Membership`, and it returns a number, so no coven name or id leaves the database layer. A soft-deleted row, a soft-deleted coven, and a row naming a coven's own ingredient are not counted. The `ingredients` service `countCompendiumEntryUsers(session, id)` in `services/compendium.ts` checks `assertCurator`, then `NotFound` for an id that is not a live compendium entry, and the delete confirm reads it through `Query.compendiumEntryUsers` ([`graphql/schema.md`](../graphql/schema.md), "The compendium mutations"). It sits in `compendium.ts` because that file holds the compendium tier's curator reads and `deleteCompendiumEntry`, whereas `cupboard-entries.ts` services act for a coven under a membership.

### When the compendium retires the entry

A curator's delete soft-deletes the `ingredients` row alone: its forms stay live, and so does every cupboard row naming it. M12.24 decides what those covens see. The entry leaves the compendium at once, and a coven whose cupboard names it goes on reading it, marked, until the coven removes its own row. A coven that never added it reads nothing, even if it has a jar of one of its forms. The record is [`m12.24-retired-entry-stays-readable.md`](../design-decisions/m12.24-retired-entry-stays-readable.md).

- **`findCupboardEntryIncludingSoftDeleted(membership, ingredientId)`** in `cupboard-entries.ts` is the escape hatch ([`soft-delete.md`](soft-delete.md)). It reads the entry past its tombstone and returns it beside the cupboard row, or `undefined`. It returns the entry only while it is a compendium entry and the proof's coven has a live row naming it; the row's own tombstone still filters. The service reaches it as `heldCompendiumEntry(membership, ingredientId)` in `services/cupboard-entries.ts`, and `isRetired(row)` there says whether an entry is retired: a compendium row with `deleted_at` set.
- **The entry.** `getIngredient(session, id, workspaceId)` tries the hatch only when its live read misses, so a live entry is read as before. `ingredientDetailOf` sees a retired entry, asks the coven for `{ ingredient: ['read'] }` (viewers included), and reads the hatch again: `NotFound` without a coven named or a row, `Forbidden` without a session. It answers `retired: true`.
- **Its children.** The child readers in `services/ingredient-children.ts`, and the repository finders under them, take an optional last `heldBy` proof. With it, `inUseIngredientParent` and `inUseVariantParent` in `ingredient-parent.ts` admit the retired parent while `heldBy`'s coven names it in its cupboard, and admit a live parent exactly as `readableIngredientParent` and `readableVariantParent` do. The tier is checked on both arms, so a stray cupboard row naming a coven's own deleted ingredient admits nothing. A retired entry's tier is still the compendium's, so a reader's `where` that compares a child's tier with its parent's works unchanged. `ingredientDetailOf` passes the proof to every reader: folk names, categories, deities, substitutes, references, and each form's categories, substitutes and references.
- **Its jars.** `findManyStock` reads every jar through `inUseVariantParent` with the coven's own proof, so `stockOf`, `updateStock` and `deleteStock` go on working on the coven's jars of a retired entry, and on no other coven's.
- **What drops it at once.** The public page and the public list with its search (`findCompendiumEntryBySlug`, `findCompendiumPage`), the add flow's exact match (`findCompendiumMatchesByName`), and both groups of the ingredient picker read live rows only and take no `heldBy`. So does `findReadableVariant`, so `createStock` refuses a new jar of a retired entry's form with `NotFound`.
- **On the page and the wire.** `Ingredient.retired` is true for a retired entry. The coven's entry page marks it **No Longer in the Compendium** and gives it no public link, no canonical address and no Edit, since the compendium no longer holds it.

Not yet covered: the GraphQL child loaders and `Ingredient.cupboardEntry` read nothing for a retired entry, because a loader's key carries no reading coven to prove the cupboard row with; the cupboard list row is M12.18's, and the mark on cupboard rows and jars waits for those screens.

`tests/modules/ingredients/services/retired-entry.test.ts` holds the service half: the holding coven's reads and jars, the other coven's `NotFound`, and every reader that drops the entry, each beside its state before retirement. `tests/db/repository/cupboard-entries.test.ts` holds the hatch's rows and the `heldBy` arm.
