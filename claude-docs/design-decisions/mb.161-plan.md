# MB.161 — An `unknown` classification may carry a formal name

**Status:** decided · **Date:** 2026-10-06

Minted during MB.131, on the owner's question of what it would take for a
Classification of Unknown to hold a Formal Name. Until now `none` and `unknown`
both forbade one, under a biconditional enforced three times: the CHECK
`ingredients_nomenclature_declares_canonical_name`, Zod's `crossFieldRules`,
and the form shutting the field. DESIGN.md §5 carries the rule; this record
carries what was weighed. The build is MB.161.

## The decision

- **Three cases, not a biconditional.** `none` takes no formal name; the five
  named kinds — botanical, fungal, zoological, mineral, chemical — each take
  one; `unknown` takes either. The CHECK becomes
  `nomenclature = 'unknown' OR (nomenclature = 'none') = (canonical_name IS NULL)`,
  and Zod refuses the same two cases with the same messages.
- **`unknown` means the classification is unsettled.** It still says a formal
  name exists, as §5 has it; it no longer says nobody has written it down. A
  name it carries is unconfirmed until a kind is chosen.
- **A workspace entry with a formal name and no kind saves as `unknown`.**
  `LocalIngredientInput` asked for a kind instead; `unknown` is the one answer
  that admits the name without claiming its system, which `none` would
  contradict and `botanical` would guess. A name-only entry still saves as
  `none`, so story 29's stub is unchanged. `CompendiumIngredientInput` still
  makes the admin answer.
- **The form's marks follow.** The formal name is marked required only under a
  named kind, stays open and optional under Unknown, and is shut and emptied
  under None alone. A typed formal name no longer marks the classification
  required.

## What it touches, and why each is acceptable

- **Identity.** `canonical_key` is `lower(coalesce(canonical_name, name))` plus
  the form, with no `nomenclature` in it, so an `unknown` entry with a name is
  keyed on the name. The same name under two kinds is now a duplicate rather
  than two entries, and local-beats-compendium resolution matches it by formal
  name rather than label — both what the identity model wants.
- **An unconfirmed name is identity.** Correcting a mistyped one re-keys the
  entry and, since the slug is built from the formal name, moves a compendium
  entry's old slug to `retired_ingredient_slugs`. That path already runs for
  `unknown` becoming a named kind; nothing new is built for it.
- **Display.** The italics of a binomial follow the kind, and `unknown`
  settles none, so its name is set upright and shown as unconfirmed. M8.19's
  empty state is for `none` and a nameless `unknown`.
- **The curation to-do list stays one.** M5.5's `nomenclature = 'unknown'`
  filter now returns rows with a name, needing only a kind, beside rows
  without, needing the name looked up too. Both need the admin and the
  formal-name column tells them apart, so a second filter would split one
  list for no reader.
- **The migration only widens.** Every row the old CHECK admitted, the new one
  admits, and no backfill runs. Replacing the constraint drops the old one,
  which the destructive-DDL check flags, so it carries an `.ack.md` sidecar;
  it is one PR, not rule 10's two, since nothing is dropped that code still
  reads.
- **A rollback is tolerable.** Code rolled back past MB.161 reads an `unknown`
  row with a name and renders it, and its Zod refuses an edit to that row until
  the name is cleared or a kind chosen. No write is lost.

## Not chosen

- **A separate "confirmed" flag on the formal name.** It would say what
  `unknown` with a name now says, as a second column every reader must
  consult.
- **Keeping the refusal and guessing the kind.** That is the silent guess §5
  forbids, and the reason `unknown` exists.
