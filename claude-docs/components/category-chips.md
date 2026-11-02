# CategoryChips

An entry's categories as a row of chips: the first `CATEGORY_CHIP_LIMIT` (2) shown, the rest behind a +N button. Shared by the ingredient card ([`ingredient-card.md`](ingredient-card.md)) and the admin Compendium table ([`compendium-list.md`](compendium-list.md)), so both draw and behave alike. `src/components/CategoryChips/`.

## Props

| Prop         | Meaning                                                                                                                                                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `categories` | Each category with its group's colours; none draws no row                                                                                                                                                                                                                                               |
| `label`      | The entry's label, for the +N button's and the panel's accessible names                                                                                                                                                                                                                                 |
| `showAll`    | Draw every chip with no +N button (default `false`). The spell recipe (M13.21) and Category Match's Carried and Missing rows use it; the Extra row passes `limit={8}` instead                                                                                                                           |
| `limit`      | How many chips show before +N, in place of the default of two (ignored with `showAll`): Category Match's Extra row draws eight                                                                                                                                                                          |
| `tipOf`      | Optional: a function from a category to the words of its tip. Given, every chip (and those behind +N) is a button carrying that tip, opened by hover, focus and tap, and described by it for a screen reader; not given, chips are plain text (the default). The spell builder's Category Match uses it |
| `compact`    | The tighter chip size for a table cell; the card keeps the regular one (default `false`)                                                                                                                                                                                                                |
| `absent`     | Draws the chips hollow (no fill, a dashed muted border, muted text), for categories that are named but not there: Category Match's Missing row (default `false`)                                                                                                                                        |

**A category only a form carries.** A `CardCategory` may carry `forms`, the names of the forms that carry a category its entry does not (a result card reads them, [`compendium-read.md`](../db/compendium-read.md), "What a result card shows"). Such a chip is a tip chip whatever `tipOf` says, its tip naming the forms ("On: Oil, Dried Leaf"), and is drawn as the plain chip with a dashed border (`.category-chips__form-chip`), so it reads apart from the entry's own. The caller puts those chips after the entry's own; the row keeps the order it is given. `chip-tip.ts` picks a chip's tip.

`CardCategory` and `CATEGORY_CHIP_LIMIT` live here; the card re-exports the type. The chips are full-level chips ([`styling.md`](../styling.md), "Category chips"), plain text and not links; the list is named "Categories".

## The +N toggletip

`category-tip-chip.tsx` is the chip with a tip: an `IconTip` around a button (so focus and a tap reach it) plus a visually hidden copy of the words that the button points at with `aria-describedby`; also a client child. `category-more.tsx` is a client child, so `CategoryChips` stays server-compatible. Focus opens the panel at once, and a hover once the pointer has rested 300ms, as every tip does (`TIP_OPEN_DELAY_MS`, the owner's call, 2026-10-20; [`info-tip.md`](info-tip.md), "Behaviour"), so a pointer crossing the row opens nothing; a pointer that leaves sooner opens nothing either, since the wait and the leave's grace share one timer. A click (a tap) pins it open at once and a second click closes it. Escape closes it and returns focus to the button; a press outside, or the pointer leaving (after a 120ms grace, WCAG 1.4.13), closes it too. It fades at `$tip-fade`. The button has no dot, and its name carries the count ("3 more categories for Testwort").

The panel is `position: fixed`, placed by Floating UI beneath the chip row (the Combobox's list does the same), as wide as the row and at least 12rem. It is not absolute because the admin table's frame scrolls and would clip or stretch around an absolute panel. It flips above near the window's foot and follows the row only while open. Because it floats, it never changes its row's or card's height. It stands at the `floating` layer, above the rows beneath and their Edit pencils; the card lifts itself with `isolation` and `z-index` while a panel is open (no transform, so fixed placement holds).

## Sizes

`compact` adds `category-chips--compact`, which applies `chip($size: compact)` ([`styling.md`](../styling.md), "Category chips", "Size") to the chips and the button, with a 4px row gap. About 18.8px tall. The +N button's pill is as short, with a transparent 24px hit area (WCAG 2.5.8).

## Styling

Tokens only, as signed off in MB.120 (2026-10-20). `CategoryChips/index.scss` styles the chip inside the list (`.category-chips .chip`), the `+N` item (`.category-more-item`) and its button (`.category-more__button`, a `space()` step), the toggletip's fixed panel and its fade (`.category-more__panel`), the compact size (`.category-chips--compact`) and the dashed chip of a category only a form carries (`.category-chips__form-chip`: no fill, a border in the group's own colour through `group-colour()`, the owner's call recorded in [`m14.38-form-categories-in-search.md`](../design-decisions/m14.38-form-categories-in-search.md)). The chip itself is the shared `.chip`
primitive.

**On a phone** the chips wrap with their row. The `+N` panel is fixed and placed by Floating UI, so a narrow card or table frame never clips it; it flips above near the window's foot. The compact size grows the `+N` button's hit area to 24px (WCAG 2.5.8). Under reduced motion the panel appears without fading.

**Forced colours.** No rule of its own: a chip keeps its 1px border, which forced colours repaints in the system's ink. The forced-colours pass over the compendium section is M14.3, a Wave 14 task (minted from MB.120).

## Testing

`tests/components/CategoryChips` covers the chips, the limit, the panel's open and close paths, and a form-only chip's place after the own chips and its tip, in the row and behind +N. Placement and height are measured in a browser: `tests/e2e/public-compendium.spec.ts` (the card) and `tests/e2e/admin-compendium.spec.ts` (the table, desktop and phone).

## Stories

`src/components/CategoryChips/index.stories.tsx`, titled "Ingredients / Category Chips": `States`, a grid of No Categories, Exactly At The Limit (two chips), One In The More Button, Several In The More Button, More Panel Open (the +N panel pressed open), In A Scrolling Frame (as the admin table holds it, the panel not clipped) Sizes (the regular size the card wears and the compact one the table does) and On A Form Only (an own chip, then two dashed chips only forms carry).
