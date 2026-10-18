## The demo scenario (M1.23)

`src/db/seed/demo.ts` implements DESIGN.md §"Seed data"'s third scenario:
`standard` plus spells in W's grimoire, with ingredients and layer order. It is
the scenario a screenshot is taken against, which is why the two jars are
written out the way a member would write them — an intent in a sentence,
instructions that read like instructions, a stack that names what went in and
in what order — rather than generated as "Spell 1" and "Spell 2".

| Spell              | Id      | Status     | Layers                                                                       |
| ------------------ | ------- | ---------- | ---------------------------------------------------------------------------- |
| Hearth Warding Jar | `…0001` | `complete` | sea salt · black salt · hearth ash · **dust from the front step** · rosemary |
| Dreaming Sachet    | `…0002` | `draft`    | mugwort · lavender · german chamomile · amethyst                             |

The ids are fixed and take a block of their own, `…0002-…`, after the users
(`…0000-…`) and the workspaces (`…0001-…`), so a stray id is never ambiguous
about what it names. A draft sits beside a finished spell because the status
badge (M10.20) has to have both to show, and one layer carries no quantity at
all — a sprig laid on top is not a measurement, and `quantity`/`unit` are
nullable precisely so it does not have to be one.

**The curated compendium comes with it.** After `seedStandardContent`, in the
same transaction, `demo` calls `seedCompendiumContent(tx, COMPENDIUM)`, so a
person exploring the app finds the real compendium (every curated entry and
its sources) beside standard's fixture entries, not only the 26 invented ones.
The vocabularies it picks from are already there, since `standard` seeds them.
The order matters: the fixture entries go in first and keep their rows, and a
curated entry of the same identity, name or slug is skipped as present. The
guard (`assertCompendiumValid`) runs before the transaction opens, so an invalid
literal writes nothing. `standard` stays without it: it is the test fixture
cast, and its tests rely on those rows alone. The layers name fixture entries
by tier and identity, so the extra entries make none of them ambiguous.

**Four things in it are fixtures rather than decoration:**

- **W's cupboard** (M12.26), the compendium entries a coven holds as
  `workspace_compendium_entries` rows ([workspace-compendium-entries.md](workspace-compendium-entries.md)).
  The seed inserts them directly, stamped like every other row, and does not
  call the cupboard service. Three, one of each kind of row:
  - **Rosemary**, labelled `Garden Rosemary`, with its own description,
    "Cut from the bush by the back door, dried in bunches over the stove."
    (an annotated row with a label and a text override);
  - **German Chamomile** (_Matricaria chamomilla_), labelled `House Chamomile`,
    with `colors` set to `white` and `yellow` (a label and an array override;
    the compendium lists no colour for it);
  - **Ginger** (_Zingiber officinale_), with no override at all (in the
    cupboard and not annotated).

  Every other column is null, so it reads as the compendium's value. These
  three were W's own rows until M12.26, which shadowed the compendium's entry
  under the hiding rule (M8.3, M12.12); a coven now names the entry instead of
  copying it. The two jars' layers for Rosemary and Chamomile point at the
  compendium's variants (Rosemary's `Herb`, Chamomile's `Flower`). The demo
  seeds no stock, so no jar sits on a compendium variant; when one does, its
  entry has a row (decision 11 of the plan,
  [m12.13-cupboard-names-the-compendium-plan.md](../design-decisions/m12.13-cupboard-names-the-compendium-plan.md)).

- **W's own ingredients**, the coven tier of §5's one table: `Hearth Ash` and
  `Cat's Claw`. A grimoire that only ever reached the compendium would exercise
  half of §5, and the jars mix the two the way a real one does.
- **Cat's Claw is the "Similar in the Compendium" case** (M12.22). W's entry
  has no formal name (nomenclature `unknown`, one `bark` variant), and
  `standard` seeds five compendium Cat's Claws (four plants and the animal
  claw). It stays an own stub beside them, with no cupboard row, for a member
  to declare it to be one of the five. Until M12.28 retires the hiding rule it
  also still replaces all five in the lists, and its page shows three links
  then "See All 5" (`tests/db/seed/demo.test.ts` pins that none of the five is
  in the cupboard).
- **One custom, one-off layer** (MB.40, story 57): "Dust from the front step",
  `form` `dust`, no `ingredient_id`, sitting between two linked layers in the
  same jar. It is never an `ingredients` row anywhere, and `dust` is nowhere in
  M4.3a's curated 78 — free text is what lets a member write it. Wave 13
  renders, reorders and prints both kinds of row, and this is its row of the
  second kind.

Layer order is the position in the `layers` array, never a number written
beside it: one list, so the stack and its depths cannot disagree, and each jar
is numbered from 1 — what M10.16's reorder rewrites and M10.9's read orders by.

**W's own entries have variants too (MB.216, MB.222).** Each of W's two
literals lists its forms as `variants`, as the compendium's do
([standard-scenario.md](standard-scenario.md)). After W's entries,
`insertMissingVariants` from `standard.ts` writes them, typed rather than
picked, lower-case as the literals spell them (Hearth Ash is `ash`, Cat's
Claw `bark`). A linked layer lays its ingredient's first live variant in form
order, read back after the variants are written; every ingredient a jar names
has one, and Rosemary's `Herb` comes before its `Oil`.

M12.26 moved Garden Rosemary, House Chamomile and Ginger off this list, so the
seed no longer holds a coven entry in the identity of a compendium one except
Cat's Claw (which has no formal name). It also loses `rhizome`, the uncurated
form Ginger carried as §5's example of a value a member writes before an admin
curates it: no coven entry in the demo has one now.

A layer finds its ingredient by tier and identity (`ingredientIdByIdentity`),
the same key the cupboard rows use.

### A jar's stack is seeded whole or not at all

Idempotency is `standard`'s — insert what is missing, keyed on identity,
ignoring `deleted_at` — for the spells (fixed id), W's ingredients
(`identityOf`, the identity, over W's rows, deleted or not) and the assigned categories (the
pair), and W's cupboard rows (the coven and the entry), a row the coven
removed counting as present. A database seeded before M12.26 still holds
Garden Rosemary, House Chamomile and Ginger as own rows, which a reseed leaves
alone: `make db-reset` is what brings it to this scenario. **`spell_ingredients` is the exception: the unit keyed on is the spell,
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
(`spell_ingredients_spell_id_variant_id_unique` since MB.217, on the
ingredient's variant). Either collision fails the
whole scenario rather than the row.

So a jar that already has layers is left exactly as it is — removed ones
included, since a tombstone is a layer the jar has had, and a jar a member
emptied has been edited rather than left unstocked. What that gives up is a
demo jar healing itself after someone empties it, which `make db-reset` (M1.24)
does properly anyway; what it buys is that a reseed over an edited grimoire is
a no-op rather than an error. A developer scenario, so no test holds it
(MB.225).
