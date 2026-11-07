# Ingredients, a map

This page maps the `ingredients` module across the files that describe it. It states the rules in one place and points to the file that holds the detail. DESIGN.md §5 is the specification.

## What the module owns

`src/modules/ingredients/` owns what exists and what a coven has: the compendium (the global, keeper-curated reference), a coven's own ingredients, the compendium entries a coven's cupboard holds, and the coven's stock. It also owns the unit vocabulary and the `references` rows that source every entry.

## Tables

- `ingredients` holds both tiers. A compendium row has no `workspace_id`; a coven's own row has one. The formal name is the identity, and `name` is only what the ingredient is called in that tier. Slugs come from `src/lib/slugify.ts` (`ingredient-slugs.md`).
- `ingredient_variants` holds each form an ingredient comes in. A variant's `form` is text, not a foreign key. Stock and spell layers name a variant.
- `ingredient_folk_names`, `ingredient_categories`, `ingredient_substitutes` and `ingredient_deities` hang off an ingredient and take their parent's tier (`ingredient-children.md`).
- `workspace_compendium_entries` says that a coven's cupboard holds a compendium entry, and carries the coven's own wording over it (`workspace-compendium-entries.md`).
- `inventory_items` is the stock table; `units.ts` beside it is the one place units are defined (`stock.md`).
- `references` and `reference_links` record the source of every entry and curated row (`references.md`).

## Services

- `compendium.ts` and its neighbours read the public compendium with no session (`compendium-read.md`). Keeper writes are in `compendium-writes.md`; the cached reads are in `compendium-cache.md`.
- `workspace-ingredients.ts` creates, updates, deletes and reads a coven's own ingredients. Each asks for a `Membership` proof and ANDs `workspace_id` itself (`workspace-ingredients.md`).
- `cupboard-entries.ts` adds, edits and removes a compendium entry in a coven's cupboard.
- `stock.ts` writes stock and converts units within one dimension (`stock.md`).

## Visibility rules

- The compendium is public. A hidden entry's page is reached through a separate uncached read that curators and keepers use.
- A coven's own ingredients, stock and cupboard entries are its members' alone. A site keeper or curator holds no access to them.
- A workspace entry's slug at the public route is a 404.
- A coven's cupboard is its own entries plus the compendium entries it names in `workspace_compendium_entries`. Nothing is hidden on a name match.
- Suggestions by common name or form draw from the compendium and the current workspace only.
- A variant adds to its ingredient and never removes from it. An ingredient with no variant is information only.

## Where the detail lives

- Tier-scoped finders, soft delete and the proof: `finder-convention.md`, `soft-delete.md`, `membership-proof.md`.
- Search, ranking and facets: `compendium-read.md`, `fuzzy-matching.md`.
- Categories and vocabularies: `categories.md`, `astrology-vocabularies.md`, `deity-vocabulary.md`.
- Ingredient row writes: `ingredient-children.md`.
- Unit conversion: `stock.md`. Conversion refuses across dimensions and has no density table.
