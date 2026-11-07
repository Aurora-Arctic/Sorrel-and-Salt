# MB.124 — Design review: error pages, empty states and the whole site

**Status:** decided and built; no full test suite has run · **Date:** 2026-11

Plan: [`m11.9-plan.md`](m11.9-plan.md), Part 3. The owner picked per decision on a private sign-off page; the picks are recorded here.

## Decisions

- **error-buttons.** Try Again is solid on the 500 and global-error screens. Back to Sorrel & Salt is quiet everywhere. Report This stays an icon-only quiet button.
- **error-reference.** The 500 page's reference number sits under the buttons as a muted caption.
- **403-wording.** Every 403 says "Your account cannot open this page." and names no role.
- **403-report.** The 403 has no Report This.
- **404-signed-in-frame.** The unmatched 404 draws inside the full shell, the same as `notFound()`.
- **404-signed-out.** A signed-out visitor at an unknown address gets a 404 in the public frame.
- **empty-state.** One `EmptyState` component with a page size and a compact size ([`components/empty-state.md`](../components/empty-state.md)).
- **empty-count-line.** The count line is hidden while a list is empty and unfiltered.
- **no-match.** Every no-match state offers a quiet Clear Filters.
- **shell-add-weight.** No pick; the owner said to leave it with two. The shell's Add Ingredient stays solid beside a page's own solid action. Not built.
- **panel-width.** The account menu and the switcher list share `$panel-min-width` (15rem) and `$panel-max-width` (18rem). Suggestions stay at the field's width. The owner asked for 45px rows; the build keeps the existing row height.
- **account-sign-out.** Sign Out is a plain row under a hairline.
- **card-page-heading.** Card pages set the h1 at the h2 size, centred with the lede (`.card-page-header`); Create Coven joins them.
- **heading-left-edge.** Three column types are written down in [`styling.md`](../styling.md). The narrow column is `$narrow-column` (28rem, 448px). The code holds no 440px width, so nothing moved.
- **pause-reason.** Other keepers see no Pause control, only the sentence; "Keeper changes are paused." while paused.
- **Straight fixes.** Approved as written.

## Left as it is

- **QR criterion.** Left out by the owner's decision.
- **`$layers`.** It already exists at `_variables.scss:955` and is stale. `styling.md` allows single-digit local z-index values; recorded, unchanged.
- **`ingredient-entry__empty`, `chip-color-field__empty`, `combobox__empty`.** Field-level absences stay inline.
