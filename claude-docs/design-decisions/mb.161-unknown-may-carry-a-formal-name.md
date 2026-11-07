# MB.161 — An `unknown` classification may carry a formal name

**Status:** decided. The rule lives in `claude-docs/db/identity-model.md` (nomenclature) and DESIGN.md §5; this record keeps what it rules out.

## Decision

`none` takes no formal name, the five named kinds each take one, and `unknown` takes either. A workspace entry with a formal name and no kind saves as `unknown`, which admits the name without claiming its system. A name-only entry still saves as `none`.

## Why

`unknown` means the classification is unsettled, not that nobody has written the name down. A name it carries is unconfirmed until a kind is chosen, so it is shown upright and marked unconfirmed.

## Consequences worth knowing

- `canonical_key` has no `nomenclature` in it, so the same name under two kinds is a duplicate, not two entries.
- Correcting an unconfirmed name re-keys the entry and retires the old slug of a compendium entry.
- The curation to-do list stays one list: rows with a name need a kind, rows without need the name looked up too.
- The migration only widens the CHECK, so it needs an `.ack.md` sidecar but is one PR.
- Code rolled back past this change reads an `unknown` row with a name and refuses an edit to it until the name is cleared or a kind chosen.

## Rules out

- A separate "confirmed" flag on the formal name: a second column every reader must consult, saying what `unknown` with a name now says.
- Keeping the refusal and guessing the kind: the silent guess §5 forbids.
