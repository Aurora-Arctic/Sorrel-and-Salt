# MB.138 — A substitute is a row that links an ingredient or names one

**Status:** decided · **Date:** 2026-10-05

M5.9's review settled, on the owner's decision, that a substitute may link an
existing ingredient: `ingredients.substitutes text[]` becomes a child table,
one row per substitute, each either a link or a free-text name, in the shape
MB.40 gave a spell's layers. This record settles what the task left open, and
why. The build is MB.139 (the table and its fill), MB.140 (the switch) and
MB.141 (the drop), under rule 10. DESIGN.md §5, `ingredient_substitutes`,
carries the model; this record carries the alternatives.

## Decided

**The table.** `ingredient_substitutes`: `id`, `ingredient_id`,
`substitute_id` (nullable), `name` (nullable), and the full audit spread. `CHECK (num_nonnulls(substitute_id, name) = 1)`, `name` checked
non-blank, and `CHECK (substitute_id <> ingredient_id)`. An index on `ingredient_id WHERE deleted_at IS NULL`, the parent's; two partial
unique indexes, on `(ingredient_id, substitute_id)` for links and
`(ingredient_id, lower(name))` for names, each over live rows of its kind; and
none leading on `substitute_id` (see the deletion rule). A substitute typed without picking an
ingredient is stored as text, without a warning. The owner restated that while
this was scoped: an ingredient not yet entered is just its text.

**The tier rule.** A compendium entry's substitute links only the compendium. A
coven ingredient's links the compendium or its own coven, never another
coven's.

- _Why not either way for both tiers:_ the compendium is the public, indexable
  surface (MB.80). A link from an entry to a coven's ingredient would put that
  ingredient's name, and the fact that it exists, in front of every reader,
  where a coven's contents are private (§8).
- _Why a coven may link the compendium:_ nothing is revealed, since the
  compendium is everyone's, and it is where most of what a member would name
  already lives.
- _Where it is held:_ in the service (MB.140), against the writer's own read
  scope, and refused as a field error pathed to the entry. A CHECK cannot read
  the linked row. The read ANDs the same rule, so a row written past the
  service still shows nothing.

**The deletion rule: a link to a deleted ingredient is kept, and shown by its
last name**, as plain text with nothing to follow. This was the owner's choice
of three.

- _Turned to text at the delete._ This keeps rule 4 as it was, but an admin
  deleting a compendium entry would rewrite rows in every coven that linked it,
  the access to a coven's ingredients that M6.6 asserts an admin never has, and
  that rule 5's proof gives an admin no handle on. It is also lossy: v2's
  restore (§13) brings the ingredient back and not the links.
- _Dropped from the list while the ingredient is deleted._ No exception and no
  cross-tier write, and a restore would bring it back. But a substitute the
  member recorded would vanish without a word, which is the failure M5.3
  refused for a spell.
- _Kept, shown by last name (chosen)._ Read-only and reversible. The cost is a
  third named finder that reaches a soft-deleted row, in M5.3's shape: it skips
  the linked ingredient's `deleted_at` and no other filter, and the soft-delete
  guard pins it. CLAUDE.md rule 4 now names it.
  - The last name is the deleted row's own `name`, since no writer touches a
    deleted row.
  - As with a spell layer, a link already reaching a deleted ingredient
    survives a save of its parent, and a new one cannot reach one.
  - Nothing reads from a linked ingredient back to its linkers, and nothing
    hard-deletes an ingredient, so MB.139's index on the linked id, which was
    meant to let a deletion find what pointed at it, is not built.

**The audit shape: the full spread, soft-deleted**, as `ingredient_folk_names`
is.

- _Why not MB.34's four stamps and a hard delete:_ MB.34's deciding cost is the
  `deleted_at IS NULL` that a service joining _through_ a table must remember.
  Nothing joins through this one, and a finder selecting from it filters it for
  nothing. And a substitute is content, a member's text or claim, rather than a
  pairing of two curated rows.
- _What it buys:_ v2's history and trash view restore it like any other row.
- _What it costs:_ the table's own `set_updated_at` trigger line (M1.18), and
  replacing a list by diff, as `replaceFolkNames` does: an entry still listed
  keeps its row, one no longer listed is soft-deleted, and a new one is
  inserted.

**The order rule: alphabetical, by the name each substitute shows**, as folk
names are, the owner's call. That name is the linked ingredient's label, its
last label once deleted, or the typed text, so a relabelled ingredient moves
with its new name. The read sorts in the service as `folkNamesOf` does, and
nothing stores an order.

- _Kept as entered, as the correspondence lists are since MB.134 (first
  proposed):_ a stored `position`, unique among live rows as
  `spell_ingredients.layer_order` is. The owner chose alphabetical instead,
  which drops the column, its partial unique index and the scratch-offset
  reorder a position needs. A save becomes a set comparison, as folk names'
  is.
- The fill copies `substitutes text[]` across as names. The order the array
  held is not kept.

**No repeats**, the owner's call, made once the order was alphabetical. The
same ingredient linked twice, or the same name typed twice in any case, is
refused, as a repeated folk name is.

- _Allowed, as in the correspondence lists (first proposed):_ a repeat there
  can at least sit in another place in an ordered list. In an alphabetical one
  it is only a duplicate beside itself.
- _How:_ the two partial unique indexes are `spell_ingredients`' shapes for its
  links and custom names. The shared schema refuses the repeat first, pathed to
  its position, so neither index is what a member sees.
- A typed name equal to a linked ingredient's label is not a repeat: one is text
  and the other a link.
- The parent's plain index stays: a read of all an ingredient's rows implies
  neither unique index's predicate, so neither can serve it.

**The GraphQL shape.** `Ingredient.substitutes: [Substitute!]!`, alphabetical,
`[]` when there are none, as `folkNames` is, where the array was nullable.
`Substitute { name: String!, ingredient: Ingredient }`:

- `name` is the linked ingredient's label, or its last label once deleted, or
  else the typed text.
- `ingredient` is null on typed text and on a deleted link, so a client links
  exactly when it is set.
- It resolves through a DataLoader (rule 9). One query per batch reads the
  rows and their linked ingredients, deleted or not, through the finder above.
- No `audit` on `Substitute`, as `folkNames` carries none. The input is
  MB.140's: each entry an ingredient id or a name, exactly one.

**The picker's search: `ingredientSuggestions(workspaceId, query)`**, a new
paged query built in this task on the owner's call:

- _What it reads:_ the live ingredients of the compendium and the current coven,
  exactly what a coven's substitute may link. They are matched as the
  `compendium` search matches (word similarity at 0.5 on the label, the formal
  name and the folk names, accent-folded), best match first, with a blank or
  one-character query listing by name.
- _The admin's form:_ a compendium entry's form reads `compendium(query)`, which
  holds what its substitutes may link and nothing else.
- _Why not `commonNameSuggestions`:_ it answers with strings, and a pick writes
  an id.
- _Why not `possibleDuplicates`:_ it asks whether a whole name is nearly one
  already there, by `%` at 0.4. A typed prefix never reaches that: `mu` is 0.22
  similar to Mugwort and 0.67 word-similar.
- _Why not `workspaceIngredients` (M9.4):_ it lists what a coven holds, which
  leaves out every compendium entry it has not added, and it lands in wave 11,
  after MB.131 needs it.
- _Suppression:_ local-beats-compendium suppression is M8.3's to add here, as in
  every workspace result. Until then, a coven entry and the compendium entry it
  shadows are both offered.

## What it changed

- **Docs:**
  - DESIGN.md §5 (the table and its rules), §7 (`Substitute`,
    `ingredientSuggestions`), §9 (the detail page links a linked substitute),
    §14 (two rows), and the enforcement list's rule 3.
  - CLAUDE.md rule 4 and `.claude/rules/database.md`: the third named finder.
- **Code:** the query.
  - `findIngredientSuggestions`, on the tier seam.
  - `suggestIngredients` in `ingredients`, and its GraphQL field.
- **Task text:**
  - MB.139: the index on the linked id is not built, and the two unique
    indexes are.
  - MB.140: the deletion finder and the guard, and the schema refusing a
    repeat.
  - MB.131: names `ingredientSuggestions`, and `compendium(query)` for the admin
    form.
  - M8.3: suppresses here too.
  - M8.19: a linked substitute leads to its ingredient.
