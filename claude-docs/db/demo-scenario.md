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
  call the cupboard service. Seven, so that a member opening them sees annotated entries
  with a variety of fields (the first three are the original M12.26 rows):
  - **Rosemary**, labelled `Garden Rosemary`, with its own description,
    "Cut from the bush by the back door, dried in bunches over the stove."
    (an annotated row with a label and a text override);
  - **German Chamomile** (_Matricaria chamomilla_), labelled `House Chamomile`,
    with `colors` set to `white` and `yellow` (a label and an array override;
    the compendium lists no colour for it);
  - **Ginger** (_Zingiber officinale_), with no override at all (in the
    cupboard and not annotated);
  - **Mugwort**, labelled `Hedgerow Mugwort`, with a safety note and
    `celestial_bodies` `Moon` and `Neptune`;
  - **Lavender** (_Lavandula angustifolia_), with a description,
    `elements` `air` and `water`, and `zodiac_signs` `Pisces`;
  - **Comfrey**, with a safety note alone;
  - **Sea Salt**, labelled `Kitchen Salt`, with `elements` an empty array (an
    answer, not an absence) and `colors` `grey` and `white`.

  Six of the seven are `standard`'s rows ([standard-scenario.md](standard-scenario.md),
  "W's cupboard"); `demo` adds German Chamomile. The Annotate action shows in a held entry's cupboard menu only for a role that may update
  ingredients.

  Every other column is null, so it reads as the compendium's value. These
  three were W's own rows until M12.26, which shadowed the compendium's entry
  under the hiding rule (M8.3, M12.12); a coven now names the entry instead of
  copying it. The two jars' layers for Rosemary and Chamomile point at the
  compendium's variants (Rosemary's `Herb`, Chamomile's `Flower`). The demo
  seeds its jars on cupboard entries only: a jar on a compendium variant needs
  its entry's row (decision 11 of the plan,
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
  then "See All 5" (none of the five is in the cupboard).
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

### W's stock

The demo writes eleven jars of stock into W (`DEMO_STOCK`), the rows the
ingredients page's jar lines and Edit Stock button (M9.9) show: the seven
`standard` seeds ([standard-scenario.md](standard-scenario.md), "W's stock"),
which `DEMO_STOCK` spreads in, and four of its own. Their ids are fixed and take a
block of their own, `…0003-…`, after the spells. Each names its ingredient and
the form it holds, and the seed looks the variant up by that pair, so a jar can
sit on any form an entry has.

| Ingredient (form)         | Id      | Quantity | Why it is there                                                                 |
| ------------------------- | ------- | -------- | ------------------------------------------------------------------------------- |
| Hearth Ash (ash)          | `…0001` | 250 g    | An own entry with a weight, a source and a date acquired.                       |
| Cat's Claw (bark)         | `…0002` | none     | Held and never weighed: no quantity, no unit, so "Unmeasured" and no threshold. |
| German Chamomile (Flower) | `…0005` | 8 g      | Under the default 10 g threshold, so the Low badge shows.                       |
| German Chamomile (Oil)    | `…0006` | 20 drop  | A count unit, with a threshold of its own (12) in place of the default 3.       |

The ids `…0003`, `…0004` and `…0007` to `…0011` are `standard`'s. Weight,
volume and count are all there. A jar that sets no threshold gets its unit's
default, from `defaultThreshold` in
`src/modules/ingredients/validation/default-threshold.ts`, the rule `createStock`
reads too, so the seed carries no second table of values. Every compendium entry
stocked is in W's cupboard. The
`minimal` scenario writes no stock.

Idempotency is the pair the live-unique index guards, W and the variant,
ignoring `deleted_at`: a jar the coven threw out stays out, one it edited is
left as edited, and one it added itself for the same form is met rather than
collided with. A developer scenario, so no test holds it (MB.225).

### A jar's stack is seeded whole or not at all

Idempotency is `standard`'s — insert what is missing, keyed on identity,
ignoring `deleted_at` — for the spells (fixed id), W's ingredients
(`identityOf`, the identity, over W's rows, deleted or not) and the assigned categories (the
pair), W's cupboard rows (the coven and the entry), a row the coven
removed counting as present, and W's stock (the coven and the variant). A database seeded before M12.26 still holds
Garden Rosemary, House Chamomile and Ginger as own rows, which a reseed leaves
alone: `npm run db:reset` is what brings it to this scenario. **`spell_ingredients` is the exception: the unit keyed on is the spell,
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
demo jar healing itself after someone empties it, which `npm run db:reset` (M1.24)
does properly anyway; what it buys is that a reseed over an edited grimoire is
a no-op rather than an error. A developer scenario, so no test holds it
(MB.225).
