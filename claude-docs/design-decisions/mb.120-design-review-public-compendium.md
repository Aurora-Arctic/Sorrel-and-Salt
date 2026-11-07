# MB.120 — Design review: the public compendium and shared ingredient components (#577)

**Status:** decided and built. Only the decisions, the reasons and what they rule out are kept here.

## Where the build departed

- **The sticky phone row is two lines**, not option (a): the search box on the first line, then Filters and Clear All on the second, with the Filters button filling its line. The whole stack sticks.
- **The safety bar keeps the Caution heading's text stroke.**
- **Item 2 was withdrawn**, and task 50 with it.
- **The held noun is Cupboard** (option D), not In Your Covens.
- **The tips carry the entry name**, as the accessible names do.

## Decisions taken at sign-off

The owner, 2026-10-20, one call per item:

1. **Page head**: approved.
2. **Withdrawn.**
3. **Held wording**: option D, Cupboard, in four phrasings: "In Every Cupboard" on the card's check, "In Your Cupboard" on the entry shelf, "<coven>, in its cupboard" in the menu, and "See in Your Cupboard" in Quick Look. The Quick Look list is headed "In Your Cupboards".
4. **Source link**: "Open the Source", with a hidden hint that it opens in a new tab.
5. **Safety bar**: `$rule-heavy`, with the Caution heading's text stroke kept.
6. **Sticky phone row**: two lines, the Filters button filling its line.
7. **Duplicates notice**: the interim wording now, and the block Notice minted.
8. **Form fields**: they stay in `IngredientForm/fields.tsx`. Item 54 was minted as M12.49 "recommend against" and retired the same day, on the owner's call (2026-10-20), so no task is kept; the reasons are in the comment at the top of `fields.tsx`.
9. **Drawer**: the proposed drawer tokens, with `RECENCY_AT` fixed at `corner`.
10. **Plus and check names**: the entry name goes in both the accessible name and the visible tip.
11. **Forced colours**: the current-page border mark now; the full forced-colours pass over the section is minted into Wave 14.
12. **Item 55, the Compact switch on the public compendium**: minted as M12.50 and retired the same day, on the owner's call (2026-10-20), because the different densities are intentional: the public compendium shows full cards and the coven's Ingredients list shows compact ones. The public list gets no switch.
13. **The review's repeated-code check**: a read-only pass over the branch found places that still write by hand what a mixin, token or component now holds (focus-ring insets, the nav link size, the notice bar, the held wording, the public frame beside the app shell, repeated e2e constants). The owner chose not to fix any of it in this PR; all of it is minted as M12.51, placed after MB.121 (2026-10-20). Three items the check marked as design choices (LinkHint's drop, the navigation bar's 3px, the Combobox ring) are left as they are.

Tasks 51–55 were minted as M12.47 (51, the public loading placeholder), M14.3 (52, the forced-colours pass over the section), M12.48 (53, the block Notice), M12.49 (54, generic form fields, recommended against) and M12.50 (55, the Compact switch on the public compendium). M12.49 and M12.50 were retired at sign-off and are kept as stubs in `tasks/m12.md`, because task ids are immutable; M12.47, M14.3 and M12.48 stand.
