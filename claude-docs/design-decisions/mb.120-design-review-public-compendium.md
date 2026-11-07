# Design review: the public compendium and shared ingredient components

**Status:** decided. Live home: `claude-docs/components/` (the card, Quick Look and filter docs) and `claude-docs/compendium/`.

## Decision

- **Held wording is "Cupboard"**, in four phrasings: "In Every Cupboard" on the card's check, "In Your Cupboard" on the entry shelf, "<coven>, in its cupboard" in the menu, "See in Your Cupboard" in Quick Look. The Quick Look list is headed "In Your Cupboards".
- **The plus and check carry the entry name**, in both the accessible name and the visible tip.
- **Source link** reads "Open the Source", with a hidden hint that it opens in a new tab.
- **The safety bar** uses `$rule-heavy` and keeps the Caution heading's text stroke.
- **The sticky phone row is two lines**: the search box, then Filters and Clear All with the Filters button filling its line. The whole stack sticks.
- **The duplicates notice** uses interim wording until a block Notice exists.
- **Form fields stay in `IngredientForm/fields.tsx`.** A generic form-field component was weighed and set aside; the reasons are in the comment at the top of that file.
- **Drawer** uses the proposed drawer tokens, with `RECENCY_AT` fixed at `corner`.
- **Forced colours**: the current-page border mark now; a full forced-colours pass over the section is a separate task.
- **The public compendium has no Compact switch.** Densities differ on purpose: the public compendium shows full cards and a coven's Ingredients list shows compact ones.

## Why

The held noun follows the vocabulary: a coven's own stock is its cupboard (`CLAUDE.md`, "Vocabulary" and "Domain invariants"). Naming the entry in a control's name lets a screen reader tell a list of identical pluses apart.

## Rules out

- "In Your Covens" as the held noun.
- A Compact switch on the public list.
- Fixing hand-written repeats of a mixin or token inside a design-review PR; they are collected into their own task.
- Treating LinkHint's drop, the navigation bar's 3px and the Combobox ring as repeats: each is a design choice and stays as it is.
