## The demo scenario (M1.23)

`src/db/seed/demo.ts` implements DESIGN.md §"Seed data"'s third scenario:
`standard` plus spells in W's grimoire, with ingredients and layer order. It is
the scenario a screenshot is taken against, which is why the two jars are
written out the way a member would write them — an intent in a sentence,
instructions that read like instructions, a stack that names what went in and
in what order — rather than generated as "Spell 1" and "Spell 2".

| Spell              | Id      | Status     | Layers                                                                              |
| ------------------ | ------- | ---------- | ----------------------------------------------------------------------------------- |
| Hearth Warding Jar | `…0001` | `complete` | sea salt · black salt · hearth ash · **dust from the front step** · garden rosemary |
| Dreaming Sachet    | `…0002` | `draft`    | mugwort · lavender · house chamomile · amethyst                                     |

The ids are fixed and take a block of their own, `…0002-…`, after the users
(`…0000-…`) and the workspaces (`…0001-…`), so a stray id is never ambiguous
about what it names. A draft sits beside a finished spell because the status
badge (M10.20) has to have both to show, and one layer carries no quantity at
all — a sprig laid on top is not a measurement, and `quantity`/`unit` are
nullable precisely so it does not have to be one.

**Four things in it are fixtures rather than decoration:**

- **W's own ingredients**, the workspace tier of §5's one table: `Garden
Rosemary`, `Hearth Ash`, `House Chamomile` and `Fresh Ginger`. A grimoire
  that only ever reached the compendium would exercise half of §5, and the
  jars mix the two the way a real one does.
- **Fresh Ginger carries the uncurated form**, `rhizome` — §5's example of a
  value a member writes before an admin curates it, and the second bucket of
  M4.7a's suggestion list. Since MB.162 the compendium holds only curated
  values, so it lives on a coven's entry; the compendium's Ginger is `Root`, a
  different identity, so both rows stand.
- **Garden Rosemary shadows the compendium's Rosemary** — same formal name,
  same form, different tier, which the two partial unique indexes permit. That
  pair is exactly what M8.3's local-beats-compendium resolution collapses, and
  it can only be resolved where both rows exist.
- **One custom, one-off layer** (MB.40, story 57): "Dust from the front step",
  `form` `dust`, no `ingredient_id`, sitting between two linked layers in the
  same jar. It is never an `ingredients` row anywhere, and `dust` is nowhere in
  M4.3a's curated 78 — free text is what lets a member write it. Wave 13
  renders, reorders and prints both kinds of row, and this is its row of the
  second kind.

Layer order is the position in the `layers` array, never a number written
beside it: one list, so the stack and its depths cannot disagree, and each jar
is numbered from 1 — what M10.16's reorder rewrites and M10.9's read orders by.

### A jar's stack is seeded whole or not at all

Idempotency is `standard`'s — insert what is missing, keyed on identity,
ignoring `deleted_at` — for the spells (fixed id), W's ingredients
(`identityOf`, within the workspace tier) and the assigned categories (the
pair). **`spell_ingredients` is the exception: the unit keyed on is the spell,
not the layer.**

The `standard` rows it writes through `seedStandardContent(tx)` keep their
deletions too: `demo` passes `restoreDeletedDeityPicks: false`, so the one
row a reseed of `standard` puts back, a compendium deity pick an admin
deleted, stays deleted here, since a person explores this scenario
(claude-docs/db/standard-scenario.md, "A reseed of standard puts a deity
pick back; demo does not"). A developer scenario, so no test holds it
(MB.225).

Every other seeded row stands on its own, so "insert what is missing" is well
defined per row. A layer does not — its identity is a depth in a sequence, and
the sequence is shared. Patch one row back into a stack a member has since
edited and the arithmetic is against you both ways: a layer pulled out of the
middle leaves the ones below it renumbered, so the depth the seed wants is
occupied by a different ingredient (the layer index) and the ingredient it
wants is already at another depth
(`spell_ingredients_spell_id_ingredient_id_unique`). Either collision fails the
whole scenario rather than the row.

So a jar that already has layers is left exactly as it is — removed ones
included, since a tombstone is a layer the jar has had, and a jar a member
emptied has been edited rather than left unstocked. What that gives up is a
demo jar healing itself after someone empties it, which `make db-reset` (M1.24)
does properly anyway; what it buys is that a reseed over an edited grimoire is
a no-op rather than an error. A developer scenario, so no test holds it
(MB.225).
