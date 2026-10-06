# MB.165 — A picked form or deity is recorded beside its text

**Status:** decided · **Date:** 2026-10-06

The ingredient form's lookups show which curated row a suggestion is — "Wax
(Animal)", "Hecate (Greek)" — and the save forgets it. Curated names are not
unique (MB.35): two live forms may both be "Wax", two live deities "Hecate".
`ingredients.form` is text and `ingredients.deities` a `text[]`, so "Wax
(Animal)" and "Wax (Substance)" saved alike, and nothing after the save could
say which was picked. The owner chose to store the pick first and show it
after ([`mb.165-plan.md`](mb.165-plan.md)). This record settles the model, and
why. The build is MB.165 (the column and the table), MB.166 (the fill), MB.167
(the switch), MB.168 (the drop) and MB.169 (the display), under rule 10, and
MB.170 (the reorder control) follows from the order rule. DESIGN.md §5,
`ingredient_forms` and `ingredient_deities`, carries the model; this record
carries the alternatives.

## Decided

**The text stays, and stays identity; the link sits beside it.** `form` and
each deity's name stay text, `canonicalKey` reads the text as before, and an
uncurated value such as `rhizome` stays writable. §5's rule "a vocabulary a
member writes is text" gains its link rather than losing its text.

- _Why not replace the text with a key:_ the reason `form` is text still
  holds. A key would put identity on an id and make an unlisted value
  unwritable until an admin curates it.
- _Why not leave the text alone:_ the autofill already tells the two rows
  apart, and the save threw that away. A name shared by two curated rows is
  the case the vocabularies allow on purpose, so the text alone can never
  say which was meant.

**The form's link is a column.** `ingredients.form_id`, a nullable `uuid`, a
foreign key to `ingredient_forms`. `CHECK ingredients_form_id_has_form`,
`form_id IS NULL OR form IS NOT NULL`, keeps a link from standing without its
text. That the text is the linked row's name is the service's to hold
(MB.167), since a CHECK cannot read another row.

**The deities' link is a child table, `ingredient_deities`**, since a link
cannot live in a `text[]`: `id`, `ingredient_id`, a nullable `deity_id` to
`deities`, `name`, `position`, and the full audit spread. It is
`ingredient_substitutes`' shape, but for one difference.

- **`name` is held on every row, a linked one too**, and checked non-blank
  (`ingredient_deities_name_not_blank`). A substitute holds a link _or_ a name,
  `num_nonnulls` = 1, and reads a linked one's label from the ingredient it
  links, which is why a substitute whose ingredient is deleted needed a third
  named finder reaching a soft-deleted row (MB.138). Holding the label here
  means a link whose deity is soft-deleted reads as its name through the
  repository's ordinary filter, which drops the deity and keeps the row, and
  CLAUDE.md rule 4 gains no exception. The cost is a name copied beside its
  link, written in the curated row's spelling (MB.167).
- _Why not a link or a name, as substitutes:_ that is the exception above,
  bought to show a label the row could simply have kept.

**Only a pick is a link.** Typed text is never resolved into one, as a typed
substitute is not (§5). MB.166 fills every existing entry as an unlinked name
for that reason, and because a stored "Hecate" cannot say which Hecate it
meant.

**A link to a soft-deleted row reads as its text.** The repository drops the
row, so the form reads as no pick and the deity as a typed name, and the value
moves into the in-use bucket, as §5 already says a soft-deleted vocabulary row's
value does. Nothing rewrites the ingredient, so an admin's delete still
reaches no coven's rows (M6.6).

**The indexes**, all partial on live rows:

- `ingredient_deities_link_unique` on `(ingredient_id, deity_id)` where linked:
  one live link per ingredient and deity.
- `ingredient_deities_name_unique` on `(ingredient_id, lower(name))` where
  unlinked: one live unlinked name per ingredient, case-folded.
- `ingredient_deities_position_unique` on `(ingredient_id, position)`, below.
- _Why the name index covers unlinked rows only:_ links to two same-named
  deities are two deities. An ingredient a practice gives both Greek and Roman
  Hecate carries both, and a unique name across every row would refuse the
  second, the very confusion the link exists to end.
- _A soft-deleted row reserves nothing_, as no unique index here does (rule 4).
- _No index leads on `deity_id`:_ nothing in MB.165 reads from a deity back to
  its ingredients. MB.167, moving MB.162's delete refusal onto the link, reads
  the compendium entries linking a deity, and adds an index if its plan finds
  it wants one.

**The audit shape: the full spread, soft-deleted**, as `ingredient_folk_names`
and `ingredient_substitutes` are, so the table has its own `set_updated_at`
trigger line (M1.18) and is in `AUDITED_TABLES`.

- _Why not MB.34's four stamps and a hard delete:_ MB.138's reasons hold. An
  entry is a member's claim about a practice, a typed name as often as a link,
  rather than a pairing of two curated rows, and a tombstone is what v2's
  history and trash view restore.

**The order rule: deities keep the order entered**, the owner's call, unlike
substitutes (MB.138, alphabetical). Deities are a correspondence beside
planets, zodiac signs and colours, which keep the order entered because a
practice writes its ruler first (§5, MB.134), and deities alone re-sorting
themselves after a save would be the odd one out in the form.

- _How:_ a stored `position`, unique among an ingredient's live rows as
  `spell_ingredients.layer_order` is, by `ingredient_deities_position_unique`.
  It is also the parent's index: it leads on `ingredient_id` and reads the list
  in order, as `spell_ingredients_spell_id_layer_order_unique` reads a jar, so
  no plain parent index is built. Substitutes kept one because neither of their
  unique indexes covers every live row; this one does.
- _What it costs:_ one column, one index, and a reorder in MB.167's replace
  that moves the live rows through a scratch offset, as a spell's layers do,
  since the index is checked per row.
- _Alphabetical, as substitutes (turned down):_ no stored order, and a save is
  a set comparison, as folk names' is. Simpler, but it would make deities the
  one correspondence list that does not keep what the member wrote.
- MB.166 copies the array's order into `position`, counted from 0, the
  list's own index, and dense: a skipped blank or repeat leaves no gap.

**No repeats.** Today a repeated entry in `deities[]` is not refused. Under the
table the same deity linked twice, or the same unlinked name typed twice in any
case, is refused by the two unique indexes, and MB.167's shared schema refuses
it first, pathed to its position, so neither index is what a member sees — "no
repeats", as MB.138 settled for substitutes.

- A typed name equal to a linked deity's name is not a repeat: one is text and
  the other a link. Nor are links to two same-named deities, above.

**Reordering follows, as MB.170**, the owner's call. An order the member
cannot change after typing is of little use, so the ordered list fields —
deities, planets, zodiac signs and colours — gain a reorder control. Folk
names and substitutes read alphabetically, so they get none. MB.170 also
gives a list field's chips room when they wrap onto more than one line,
which the owner found too tight.

**What stays open: one identity for two picks.** Two entries with one formal
name, one picked as Wax under _Animal_ and one under _Substance_, still share a
`canonicalKey`, since the key stays on the text. Out of scope, and noted so it
is a decision rather than an oversight.

- _Why not key on the link:_ identity would key on an id, which §5 refuses, and
  an unlinked "Wax" would then be a third identity beside the two picks.

## What it changed

- **Docs:**
  - DESIGN.md §5: `ingredients` gains `formId` and names `ingredient_deities`
    among its child tables; `ingredient_forms` records the pick and closes the
    same-named gap for one; `ingredient_deities` is specified beside
    `ingredient_substitutes`; the planets' and deities' "as `form`" wording,
    the identity table, the SQL sketch, and §14's rows on `form`, the group
    keys and the deity vocabulary, with a new row for this decision.
  - `db/identity-model.md`, `db/deity-vocabulary.md`,
    `db/categories.md`, `db/ingredient-children.md`, `db.md` and
    `modules.md`.
- **Code:** the column, the CHECK and the table, with their migration and
  schema tests (MB.165). Nothing reads or writes either yet.
- **Task text:**
  - MB.165: the order rule settled, and the position criterion.
  - MB.166: the fill keeps the array's order in `position`, dense.
  - MB.167: reads in `position` order, reorders through a scratch offset, and
    refuses a repeat at its position.
  - MB.170 minted: the reorder control, and the wrapped chips' spacing.
