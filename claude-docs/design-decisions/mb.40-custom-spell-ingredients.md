# MB.40 — A custom, one-off spell ingredient is a row in `spell_ingredients`, not a table of its own

**Status:** decided · **Date:** 2026-09-18

Story 57: a spell may call for something the workspace will never stock — a
pinch of dust from the garden path — without that thing being added to the
workspace's ingredients or its stock. M10.2 shipped `spell_ingredients` with
`ingredient_id NOT NULL` and a `(spell_id, ingredient_id)` primary key, so every
layer in a jar had to be an `ingredients` row, and a workspace-local row shows
up on the ingredients page and takes part in local-beats-compendium suppression.
This record is the shape chosen for the exception, and why it was taken now.

## Decided

**Columns on `spell_ingredients`.** `ingredient_id` becomes nullable and keeps
its foreign key; `name` and `form` are added as free text;
`CHECK (num_nonnulls(ingredient_id, name) = 1)` makes a row exactly one kind or
the other; `CHECK (ingredient_id IS NULL OR form IS NULL)` keeps `form` off a
linked row; both text columns are checked non-blank. The primary key moves to
`(spell_id, layer_order)` — the pair `(spell_id, ingredient_id)` no longer
exists on every row, and the layer is the one thing every row has. What that
key used to guarantee, one ingredient per jar, is now a partial unique index
over the linked rows; its mirror, one custom name per jar on `lower(name)`,
covers the custom rows. The table stays hard-deleted with the four stamps.

**One-off, not reusable.** A custom row belongs to one spell, shares its
visibility, and is never listed at workspace level. A _reusable_ custom
ingredient is already what a workspace-local `ingredients` row is — story 29's
one-field stub — so making this one reusable would have been a second way to
say the same thing, plus a flag to keep it off the ingredients page and out of
suppression, plus a leak: its name would live in a workspace-level list rather
than inside a possibly-private spell.

**Now, in Wave 4, not as a fast-follow.** The table is inert until Wave 13, so
the contract migration ran against zero rows, and every Wave 13 task adopts the
null-ingredient branch in its own PR rather than retrofitting it. The same task
after Wave 13 would have cost the same ~2h plus a retrofit across ten to twelve
files — service, mutations, Zod, builder, reorder, derived categories, the
out-of-stock pass, recipe and print views, the loader, every fixture that
builds a layer — and a breaking change to `SpellIngredient.ingredient`'s
nullability in the snapshot-tested SDL. Nullable from the first line, it is a
branch every consumer has always had.

## Why not the alternatives

- **A `spell_custom_ingredients` table of its own.** Pure foreign keys and an
  expand-only migration, and rejected for one reason that does not go away:
  layer ordering would span two tables, and no constraint can span tables.
  `(spell_id, layer_order)` uniqueness would be service discipline or a
  cross-table PL/pgSQL trigger — absent rather than impossible, the sweep-task
  rule's own tell. Every jar read becomes a `UNION ALL … ORDER BY layer_order`
  across M10.9, MB.6, M10.19 and M10.22; M10.16's reorder rewrites two tables
  in one transaction; the GraphQL type becomes a union every query needs
  fragments for; and quantity, unit, layer order, note and the stamps exist
  twice, free to drift. It would have been the right shape only if a custom
  ingredient carried fields a layer never has — a description, a source, a
  photo — and it carries none.
- **A surrogate `id` on the join.** The M10.2 schema comment argued against
  one: it would let the same ingredient into one jar twice with nothing
  downstream able to tell the rows apart. That argument survives the key move
  — the partial index on `(spell_id, ingredient_id)` is what holds it now —
  and an `id` would still say nothing about the jar.
- **A flag on a workspace-local `ingredients` row.** No new table, no join
  changes, and the row is still on the workspace's ingredients page unless a
  flag hides it, still in M8.3's suppression unless the anti-join learns the
  flag, still label-unique against the workspace's real ingredients, and still
  a workspace-level name for content that may belong to a private spell. Every
  place the flag has to be remembered is a place rule 4's own argument says it
  will not be.
- **`form` as a foreign key to `ingredient_forms`.** The same answer as
  `ingredients.form` (DESIGN.md §14): a vocabulary a member writes is text,
  because the member must be able to write `rhizome` before anyone curates it.
- **Name plus form in the custom-name index.** `ingredients` folds `form` into
  `canonicalKey` because two entries are matched against each other on it. A
  custom row is never matched against anything, so there is no identity key
  for `form` to be part of, and the nearer precedent is
  `ingredients_workspace_label_unique` on `lower(name)` alone: inside one jar,
  as inside one drawer, an ambiguous label is a mistake rather than a
  distinction. A jar that wants valerian root and valerian leaf writes two
  names. This is the one judgment call in the shape; if it proves wrong, the
  index is one migration and no code.
- **Keep the old layer index beside the new key.** A primary key is a unique
  btree on the same two columns in the same order. Keeping both would be a
  duplicate index for no guarantee.

## What makes this safe

- **The exclusive-or is a CHECK, not a convention.** `num_nonnulls` is the
  idiom §14 already blesses for the deferred notes model, and the schema test
  proves both refusals — neither and both — by `constraint_name`, beside the
  inserts that show why each could have succeeded.
- **Nothing lost its guarantee, and nothing gained a gap.** One ingredient per
  jar moved from the key to a partial index; one layer per depth moved from an
  index to the key; each is asserted by name in
  `spell-ingredients-schema.test.ts`, with the cross cases — a custom name at
  a linked row's depth, two custom rows at one depth — covered too.
- **Hard delete still holds, and for MB.34's own reason.** The deciding
  argument there was the `deleted_at IS NULL` a service joining _through_ the
  table must remember by hand, which is exactly how derived categories (M10.7)
  reach `ingredient_categories`. A custom row carries content, but content
  addressable only through its spell — unlike a folk name, which is addressed
  on its own and so keeps the six columns.
- **The migration is expand-then-contract in one file, reordered by hand.**
  Columns, indexes and checks first; then the old key goes, the new key is
  added, `ingredient_id` is made nullable (the key had to go first — a key
  column cannot be nullable), and the redundant index is dropped last.
  `drizzle-kit migrate` applies the file in one transaction; the order
  documents intent. `DROP CONSTRAINT` and `DROP INDEX` carry rule 10's
  acknowledgement line — the first in the repo — and `DROP NOT NULL` widens.
- **The trigger sweep needs no edit.** `0016` already attaches
  `set_updated_at` to `spell_ingredients`, a key swap does not detach it, and
  `updated-at-trigger.test.ts` applies every migration, so it doubles as the
  proof that `0017` applies on top of `0016`.

## Rules this sets

- A layer is `{ ingredientId }` or `{ name, form? }`. MB.8's Zod schema holds
  the exclusive-or and rejects `form` beside `ingredientId`, so the CHECK is
  never what a user sees; M10.10 validates before it inserts.
- A custom row contributes nothing to derived categories (M10.7, M10.9):
  `ingredient_id IS NULL` is skipped, asserted by test.
- A custom row is never an `ingredients` row. It does not appear on the
  workspace's ingredients page, does not enter local-beats-compendium
  suppression, has no safety note (M10.18), and is neither held nor not held —
  M10.19 renders it as a third state, one-off, rather than folding it into
  either.
- A custom row's visibility is its spell's (M10.5). It has no scope of its
  own, exactly like a linked row.
- `SpellIngredient.ingredient` is nullable in the SDL from its first
  definition (DESIGN.md §7); `name` and `form` resolve from the linked
  ingredient when there is one.
- M1.23's demo scenario seeds one custom row beside linked ones, so Wave 13
  tests against a real row of each kind rather than a fixture it invents.
