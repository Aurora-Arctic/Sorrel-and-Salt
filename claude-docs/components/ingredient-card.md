# IngredientCard

`src/components/IngredientCard/` — one ingredient in a list (M8.14, stories 20, 23
and 53). The one card serves the public compendium (M8.18) and the coven's
Ingredients page (M9.6). It is presentational: it takes props only and works out
nothing from the data.

## Props

`IngredientCardProps` (`types.ts`):

| Prop           | What it is                                                                                                                                                                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `href`         | The entry's page (M8.19). The name links to it through a `PendingLink` naming the page it draws (`ingredientLinkTarget`, [`loading.md`](../loading.md)), so the Compendium's and the coven's cards both show the entry page's own skeleton while it loads                                                 |
| `label`        | The label to show, already merged by the caller (`applyCupboardEntry`)                                                                                                                                                                                                                                    |
| `formalName`   | The formal name, a caption beneath the name                                                                                                                                                                                                                                                               |
| `nomenclature` | Decides its italics: only a binomial kind (`isBinomial`, shared with the entry page) is italic; mineral, chemical or none is upright                                                                                                                                                                      |
| `categories`   | The entry's categories with their groups; full chips (a wash, border and label in the group colour; no dot), the first `CATEGORY_CHIP_LIMIT` shown and the rest behind a +N toggletip, plain not links, no row when empty; drawn by the shared `CategoryChips` ([`category-chips.md`](category-chips.md)) |
| `forms`        | Draws the forms line. A coven card passes `false` (M9.9): its jar lines name each form held and its Quick Look lists them, so the line repeated both. The variants still feed the safety badge. Defaults to true                                                                                          |
| `variants`     | The entry's live forms: an icon and the name each on the secondary line; their notes and flags feed the safety badge                                                                                                                                                                                      |
| `toxic`        | The ingredient's own flag                                                                                                                                                                                                                                                                                 |
| `safetyNotes`  | The ingredient's own safety notes; notes here or on a listed form show the Caution badge, unless Toxic shows. The notes themselves are never drawn                                                                                                                                                        |
| `kind`         | `own`, `cupboard` or `compendium`; see [`entry-marks.md`](entry-marks.md)                                                                                                                                                                                                                                 |
| `recency`      | `new` or `updated` for a compendium entry (MB.106), drawn by `RecencyMark` in the card's top-right corner, just left of the safety badge (not a badge); the list page works it out from the entry's stamps.                                                                                               |
| `retired`      | The curators retired the entry                                                                                                                                                                                                                                                                            |
| `level`        | The name's heading level, 2 to 5; Defaults to 2                                                                                                                                                                                                                                                           |
| `children`     | The jar-line slot, last (see the slot’s contract)                                                                                                                                                                                                                                                         |
| `startActions` | Controls for the left end of the same foot row, level with `actions` on the right (the Quick Look eye, M12.5; the compendium's add and held icons are in `actions`); they sit above the stretched link too                                                                                                |
| `lastEdit`     | Who last edited the ingredient and when (M6.18): `{ by, at }`, `by` null when the viewer cannot name the editor. Drawn by `LastEdit` ([`last-edit.md`](last-edit.md)) in the foot, under the jar lines and directly above the actions, left-aligned. The caller works it out; none draws no line          |
| `actions`      | Buttons for the card's foot, right-aligned beneath the jar lines; they sit above the stretched link, so they press on their own                                                                                                                                                                           |
| `startActions` | Controls for the foot's start, at its bottom left, apart from `actions` at the right: the coven's Quick Look eye (M12.5). They sit above the stretched link too                                                                                                                                           |

## What it is made of

The card owns layout and nothing else. Each treatment is used as it is and never
restyled here:

- the name, an `h2` holding the card's **one link**, so the card is reached by
  keyboard through it alone. The link ends with a `LinkHint` ([`link-hint.md`](link-hint.md)), a dot that pulses while the entry page loads: the entry pages cannot have a route `loading.tsx`, so the click needs its own sign that it took. The dot is `aria-hidden`, so the link is still named by the label alone;
- the Foundations specimen layout (`.specimen` primitives): the name and formal name on the left, the marks on the right, then the category chips, the forms line (a `FormIcon` before each form, a dot between: "Herb · Oil"; it tells two entries sharing a label apart; the `forms` prop turns it off, as the coven's cards do), and the jar lines;
- the marks, in two places (the owner's call, 2026-10-20). The one safety badge, `SafetyMark` (Toxic, or else Caution, [`safety-note.md`](safety-note.md)), sits in `.ingredient-card__corner`, drawn by a second `EntryMarks` given no kind mark and no provenance, always at the card's top-right corner beside the name, with nothing to its right. `RecencyMark` (New or Updated) sits just left of it on the same line, centred across, and takes the corner itself when there is no safety badge (the owner's call, 2026-10-20). The corner is drawn when either shows. Every other mark, Local and Retired, is a row under the formal name, drawn by `EntryMarks` in `.specimen__badges` with `safety={false}`, green first ([`entry-marks.md`](entry-marks.md), "The order"). The card never shows Compendium or Annotated (`provenance={false}`, the owner's call, 2026-10-20): where a held entry came from is the entry page's to say, so the card takes no `annotated` prop. With no mark, neither holder is drawn. In the document the corner comes last, after the name, the formal name and the row, New or Updated before the safety badge: read after the name block, as the row's red mark was, and where it lands when it wraps;
- no caution block: the notes live on the entry page, and the card carries only the Caution badge, a word with no tip, so Toxic stays the one solid badge;
- the **jar-line slot**. M9.6 fills it with a line per jar (the form's icon, the
  form, quantity and unit, M9.8's `StockBadge`). The
  public compendium leaves it empty.

**The category chips (2026-10-19).** The owner first found a full grid of coloured chips too loud and chose quiet chips; with only two visible he then brought the colour back (same day). The card's category chips, the two shown and those inside the +N panel, are the **full** level of the chip family, as everywhere else: a wash of the group colour, a border and the label in the colour, with no dot (dropped 2026-10-19) (`claude-docs/styling.md`, "Category chips"). The **quiet** level (neutral ink, `$hairline` border, no group colour) stays for the +N button only, a control and not a category. The card shows the first `CATEGORY_CHIP_LIMIT` chips (2, `CategoryChips/constants.ts`): with two, and the +N button, one line holds on the regular card at its 20rem width with typical seeded names (median nine letters; three never fit). A narrower card, or longer names, wrap the row to a second line. The rest sit behind a +N button (`CategoryChips/category-more.tsx`, a client child; the card stays server-compatible). Focus opens a panel of the remaining chips at once, and a hover after the tips' 300ms wait ([`category-chips.md`](category-chips.md)), a click pins it and a second click closes it; Escape closes it and returns focus to the button, and a press outside or leaving (after a 120ms grace, WCAG 1.4.13) closes it too. The panel hangs below the chip row, over the forms and jar lines (the owner's call; it opened above at first), so the card's height never changes; it is now `position: fixed`, placed by Floating UI as wide as the row (at least 12rem), and may flip above near the window's foot (the move into the shared component, 2026-10-19; [`category-chips.md`](category-chips.md)), and it fades at `$tip-fade` (500ms, the tips' pace; dropped under `reduced-motion`). The card rises above its neighbours while the panel is open, with `isolation` and `z-index` and no transform, as for the tips. The button's name carries the count (`3 more categories for Testwort`).

The surface is `modal-surface($shadow-floating)`, not `.panel`. Order is top row, chips, forms, stock (changed 2026-10-18): the chips sit under the name and the forms line leads into the jar lines it describes, with the stock line last under its rule.

The stock badges are icon-only squares with no box, in the jars' colours
([`stock-badge.md`](stock-badge.md)). They are not `.badge`s, so the card's badge sizes
do not reach them.
**The forms line's dot is drawn in CSS and never leads or ends a wrapped line.** The mechanism is the shared `dotted-row` mixin ([`styling.md`](../styling.md), "Dotted lists"), which the admin Compendium's Form cell uses too.
Each form after the first carries a `::before` circle (4px, `currentcolor`, so not
text and never announced) in the 24px margin to its left. The line has a matching
negative inline-start margin and a `clip-path` over that band, so a dot that would
start a wrapped line falls in the clipped band and a line never ends with one,
since each dot belongs to the form after it. A screen reader gets a
`.spoken-separator` comma in each item, so "Dried Leaf, Oil" is not run together;
the jar-line dot gets the same, and the slot's CSS takes that separator out of the flex flow (`position: absolute`) so the dot has the same gap either side: left to flow, it would add a gap of its own after the dot ("Dried Leaf· 6 g").
The stock badges' tips are icon tips and open to the badge's left (`IconTip`'s default `side`), so the bubble stays on the card, which the badge's place at its right edge needs; `.ingredient-card .specimen__stock .icon-tip` lifts the badge above the card's link overlay so it keeps its own hover and focus. Nothing but those badges is focusable in the line, so the clip
cuts no focus ring.

### Sizes and padding (changed 2026-10-19)

The owner asked for smaller type, about half way to the compact look, with the spacing scaled to match but not compacted. Site tokens only. The name is `heading-size(3)` (1.8rem, was the `h2` default 2.15rem); the forms line is `type-size('small')` (0.875rem, was 1rem; its icons are in `em` and follow). Chip and badge text (the marks, Caution, Toxic, Low and Out of Stock) is `type-size('overline')` (0.75rem, was caption 0.8125rem), ; the badges take the `medium` badge size ([`styling.md`](../styling.md), "Badge sizes"), which holds them at 24px. Their padding and gaps stay. The formal name and jar lines keep their sizes. Card padding is `space(4)` (16px, was 24px); the forms line's air `space(1)` (4px, was 8px); the badge group's air below it `space(1)` (4px, was 8px). The card's own 12px gap, the 24px dot gap in the forms line and the 24px badges are unchanged.

### The safety badge beside the name (changed 2026-10-20)

The specimen tops the name and the badges flush (`align-items: flex-start`), so the 24px badges sat above the middle of the taller line of name: 1.5px high in the compact card and 4.5px in the regular one. On the card, the corner (`.ingredient-card__corner`) is a badge tall even holding New or Updated alone, and has a top margin of half the name's line box less the badge's height. The name's line box is its size times 1.15, so that is `heading-size(3)` in the regular card and `heading-size(4)` in compact. The margin centres it on the name's first line, the way the forms line's icons are centred on their line. Measured in Chromium, the same in both themes and at 1280px and 375px, the badge sits 0.3px below the text's middle in compact and 0.05px below it in regular. When it wraps beneath the name block, the margin adds to the row gap (about 2px in compact and 5px in regular), so it sits a little further under the row of other marks than they sit under the formal name. The row under the formal name is `space(2)` below it (`space(1)` compact).

### Compact

The same card in a tighter look, for a long list. It is not a prop. The look must be switchable before React runs (M9.6 stores the choice and a script sets an attribute before the first paint), and a prop fixes the look at render, which would then disagree with the server's markup on hydration. So the look is a Sass mixin, `ingredient-card-compact` (`_compact.scss`), applied in `index.scss` under `[data-density='compact']:not(:root[data-card-density='regular'] *)`: it applies wherever an ancestor carries the first attribute, unless `<html>` carries `data-card-density="regular"`, which the pre-paint script sets from the stored Compact choice (`card-density-switch.md`). `IngredientCardList` sets it from its `density` prop; a card on its own is wrapped in an element that carries it (stories `Compact`, `Compact Long Name`).

What it changes: card padding `space(3) space(4)`, the card's gap `space(2)`, the name `heading-size(4)`, the formal name, chips and badges at overline, badges at the `small` size, tighter gaps between and inside the chips, the forms line at `small` with a `space(4)` dot gap, and `space(2)` above the foot and the jar lines. What it keeps: the content, the order, the drawer slide, and every target at 24px or more. Each rule is one class deeper than the rule it overrides, which is how it wins. The regular card is used by the compendium (M8.18); the Ingredients page (M9.6) defaults to compact, with the Compact switch ([`card-density-switch.md`](card-density-switch.md)) to turn it off.

### Jar-section spacing

Every gap is a `space()` token. Before and after (px), changed 2026-10-18:

| Gap                                     | Before | After |
| --------------------------------------- | ------ | ----- |
| Between two jar lines                   | 0      | 8     |
| Forms line (or chips) to the rule above | 16     | 24    |
| Rule to the first jar line              | 8      | 12    |
| Last jar line to the card's bottom edge | 24     | 32    |

**The whole card is the link.** The name's one `<a>` stretches an empty `::after`
over the `article` (`position: relative`), the stretched-link pattern. The card
is not wrapped in an `<a>`: a screen reader would read the whole card as the
link's name, and a link cannot hold the Low badge's button. So the accessible name
stays the ingredient's name and the card has exactly one link. The Low badge's tip
anchor sits above the overlay (`z-index: 1`) and keeps its own hover, focus and
click. The category chips pass a click through the same way (the owner, 2026-10-21): the chip row's `list-reset` makes each `li` relative, so it painted above the overlay, and each plain chip's `li` now has `pointer-events: none`. The +N item is left out, so its button keeps its own press, hover and focus and does not open the ingredient. A plain chip is text with no tip, so nothing is lost, and it was never a tab stop. The forms line has `pointer-events: none`, so a click on it reaches the overlay: its `dotted-row` mixin (`clip-path`, relative items) paints above the overlay, and raising the overlay instead would cover the badge, marks and actions. The jar lines, the New and Updated mark and the foot's actions row pass a click through too (MB.272): the jar list's reset made each line's `li` relative, the mark's words and icon are relative for their optical nudge, and the actions row and its start group are as wide as the card, so each painted above the overlay and a press on a jar's words, the mark or the gap between the foot's buttons went nowhere. `.specimen__stock` and `.recency-mark` now have `pointer-events: none`, and the stock badge's tip anchor takes the pointer back and stays raised. The actions row stays raised (`z-index: 1`) but has `pointer-events: none`, and each of its children, and each child of its start group, takes the pointer back: each child is a control, or the wrapper its tip or menu opens in. What still takes its own press, and never opens the entry: the +N button, the Low and Out of Stock badges, the tipped marks (Retired, Annotated), the last-edit line, and every button and link in the foot (Quick Look, the plus or check, Edit Stock, Edit or Annotate, the dots). The cost of the overlay: text on the card cannot be selected by dragging, since a drag that starts anywhere off a control starts on the link. The name is `$text-primary` with no underline, at rest or on hover; the card shows the
pointer, and the focus ring is drawn on the overlay,
round the card.

### The drawer (M12.44)

The card is drawn as the front of an apothecary drawer. The owner approved the "Straight Out" variant of a hover mock on 2026-10-20.

- **The slot.** The component wraps the card in `.ingredient-card-slot`: the hole in the cabinet. It fills the list item's cell, is rounded like the card, and has the slot's interior colour and a soft inset shadow. It never moves. It clips nothing itself, because a `clip-path` or `overflow` on an ancestor of the card would cut off the tips and the category panel that open above the card's top edge.
- **The slide.** Under the pointer, or with focus inside the slot, the card's face lightens (`$surface-card-hover`), takes a deeper shadow (`$shadow-lifted`) and slides 11px down (`$drawer-travel`) over 300ms (`$motion-medium`). The hover is read from the slot and not the card: the face leaves the pointer's place as it moves, and the slot stays put under it, so the card does not flicker. `:focus-within` means a click's focus opens it too.
- **The drawer body.** Behind the face sits `.ingredient-card-slot__drawer`, an `aria-hidden` span that only clips, with its `::before` as the box: 10px in from each side of the slot, square-cornered, from 1px below the slot's top to 10px under the face at full travel, so no gap shows. At rest it sits one travel higher, hidden by the clip. Layers, top first: the shadow the face casts (dark for the 10px under it, fading out by 22px), 10px shading bands on each side, 7px side walls, then the back wall (top 38%), a seam easing into the floor (to 48%) and the floor.
- **Why a sibling painted first, not a negative `z-index` child.** A child with a negative `z-index` paints over its parent's own background, which put the box in front of the card. The drawer is a sibling before the card in the DOM, so the card paints over it.
- **Why offset and not `transform`.** The slide moves `inset-block-start`: a transformed ancestor becomes the containing block of the `position: fixed` tip bubbles inside the card, and Floating UI does not re-place a bubble when an ancestor's transform starts or ends, so a quick move between cards left a bubble in the wrong place. Keep `transform`, `filter`, `will-change`, `contain` and `backdrop-filter` off the card for the same reason.
- **Colours.** `--drawer-slot`, `--drawer-floor`, `--drawer-side`, `--drawer-back` and `--drawer-seam` are set per theme with the other surface colours, each a `color.mix()` in `_variables.scss`. Light stirs iron-gall into parchment (floor 9%, sides 18%, slot 25%, back 35%; the owner lightened them from 17, 32, 45 and 65 on 2026-10-20). Dark stirs chalk into soot (floor 17%, sides 25%, back 2%), and its slot is soot and the dark shadow ink in equal parts. In dark the back wall sits almost on the page, so the drawer reads mostly through its sides and shading. The shading (the face's cast shadow and the 10px washes from each side) is a theme token too: `--drawer-shade`, `--drawer-shade-fade` and `--drawer-shade-edge`. Dark keeps black at 0.5, 0.45 and 0.22, as the site's shadows do. Light uses iron-gall at alpha (0.22, 0.2 and 0.12), so it stays in the palette and is lighter: the dark strengths over a light floor read as a hole and the owner found the drawer too dark even after the colours were lightened (2026-10-20).
- **Reduced motion.** Nothing moves and nothing fades, so the drawer stays hidden; the colour and shadow change stay.
- **The stack.** The card keeps `isolation: isolate`. The slot makes no stacking context of its own, so the open card (or one with a tip still open, through `:has()`, since a tip lingers about 150ms after the pointer leaves) takes `z-index: 1` among its neighbours and its tips paint over the cards before and after it.

Muted jar text on the hovered card measures 7.99:1 dark and 6.95:1 light. A cost accepted: text in the card is harder to select, since a
drag starts on the overlay.

The foot (`.specimen__foot`) holds the jar lines and then the actions, and sits at the card's bottom, so cards of one grid row share a bottom line. The foot shows when there are jars, actions or start actions. `startActions` render first in the actions row, in `.specimen__actions-start`, whose `margin-inline-end: auto` keeps them at the left and pushes `actions` to the right: the coven's Quick Look eye sits there, with More and a pencil at the right (the owner's call, 2026-10-20; it sat after the name at first, where it wrapped the badges and sat low on the name's line). Every control in the row is centred on it (`align-items: center` on the `.specimen__actions` primitive), and the start is a flex row of its own rather than a line of text (the owner's call, 2026-10-20). As a line box, its line height and the eye's `vertical-align: middle` set the eye on the text's baseline instead of the row's centre, and a line taller than the 2rem controls grew the row, leaving the fixed-height controls at its top: forced to a line height of 3 in Chromium, the eye sat 1.8px low and the pencil and More 8px high in a 48px row. The jar lines take the `small` size in the muted ink of the `.specimen__stock` primitive, its opacity reset so the badges keep their own inks.

## Order

The card declares no sort. Two rows sharing a label keep a stable order through
the `(name, id)` keyset the list pages on
([`../db/compendium-read.md`](../db/compendium-read.md)), asserted in
`tests/db/repository/ingredients.test.ts`.

Hyphenation is the browser's dictionary alone (owner's ruling, 2026-10-18): `hyphens: auto` with `overflow-wrap: anywhere` as the fallback where the dictionary has no word. No library and no soft hyphens.

Foundations (`.storybook/foundations.tsx`, "An Ingredient Card") renders this component itself, from invented sample data and the shared `Jars` story fixture (which draws [`JarLines`](jar-lines.md)), so its look cannot drift from the card's. The `.specimen*` classes are still the card's styling source, in `_primitives.scss`.

## Styling

Tokens only, as signed off in MB.120 (2026-10-20). `IngredientCard/index.scss` holds the card, the
slot it hangs in and the drawer that opens under it; the shared `.specimen*` primitives it builds on
are in `_primitives.scss`. The compact look is the `[data-density='compact']` block of the same file and `_compact.scss`, keyed off the
list's `data-density` ([`ingredient-card-list.md`](ingredient-card-list.md)).

The drawer's measurements are tokens, not pixel literals: its inset from the slot
(`$drawer-inset`), its side walls (`$drawer-wall`), its travel (`$drawer-travel`) and its slot shadow
(`$drawer-slot-shadow`), with the shade colours as theme tokens (lighter in the light theme).
The computed styles were checked identical to the pixel values the tokens replaced (MB.120).

**On a phone** the card has no rule of its own: the list gives it the full width, one card across ([`ingredient-card-list.md`](ingredient-card-list.md)), and a long name wraps (see "A long name"). Under reduced motion the face does not slide and the drawer's shading does not transition; the colour and shadow change stay.

**Forced colours.** The card's edge is `modal-surface`'s shadow, which forced colours drops, so the card has no drawn edge there; its badges and chips keep their 1px borders, and its icons are drawn in `currentColor`. The forced-colours pass over the compendium section, M14.3, a Wave 14 task, takes this up (minted from MB.120).

## Stories

[`index.stories.tsx`](../../src/components/IngredientCard/index.stories.tsx), under `Ingredients / Ingredient Card`:
one story, `States`, a grid of the kinds (Own With Jars, In Cupboard, Retired, Compendium), the safety states (Caution, New Without Safety), the stress cases for the name (Long Name, which is also retired, cautioned and
Updated; One Long Word, Mineral Name, No Formal Name), the other marks and chips (Many Forms, No Forms Line,
Many Categories, Last Edited), the actions (With Actions, With Start Actions), the compact look (Compact)
and the recency marks (New And Updated).

## Testing

`tests/components/IngredientCard/index.test.tsx`: the card's name and link, the category chips, safety,
the cupboard marks, the jar-line slot, the actions, the navigation (the whole card is one target for the
name link) and the recency marks. Layout and the drawer's look are checked in Storybook and in the page
specs that place the card, not in jsdom, which has no layout. For the same reason, whether a press
reaches the overlay is proved in a browser: `tests/e2e/card-click.spec.ts` (MB.272) presses each
card on the formal name, its padding, the gap between the foot's controls, the New mark (on
`/compendium`) and a jar line's words (on a coven's Ingredients page), checking first that the
point is off every link and button, and expects the entry; it presses the +N, Quick Look, the plus,
Edit Stock and the Low badge and expects each to keep its own action. It also checks the card has one
link to the entry, named by the ingredient's name, the tab order, and that every control but the name
is at least 24 by 24, the last-edit line's button included ([`last-edit.md`](last-edit.md)).

## Accessibility

Meaning is carried by words and shape, never colour alone: every badge has its
text. The page that places the card (M8.18, M9.6) owns the axe run and the
keyboard walk in its Playwright spec, since the card has no page of its own.

### A long name

The top row (`.specimen__top`) wraps, in the primitive, so it holds wherever the primitive is used. On the card it holds the name block (`.ingredient-card__heading`: the name, the formal name and the row of other marks) and the corner (New or Updated, then the safety badge). **The corner stays beside the name until the name's first word no longer fits beside it, and only then wraps below the block, at the left** (the owner's call, 2026-10-20). A flex row wraps on its items' widths, so the block's is made its first word's: `flex: 1 1 0` from a zero basis, with the default `min-width: auto`, whose content-based minimum is the block's min-content width. The first word is its own span (`.ingredient-card__first`, split from the label in `index.tsx`), with `overflow-wrap: break-word` and `hyphens: manual`, so it counts whole; every other word keeps `overflow-wrap: anywhere`, which counts it as one letter wide; and the row under the formal name has `inline-size: 0; min-inline-size: 100%`, so its badges count as nothing. A plain `flex-wrap` keys on the longest word, and a `flex-basis: auto` on the whole name: before this change the badges dropped below any name that wrapped. `max-width: 100%` lets a first word wider than the card still break rather than spill. Measured in Chromium at 390px: "Testwort Longer Nameicanicusmus" wraps onto two lines with the badge beside the first, and a single 29-letter word drops the badge below the row of other marks. The pending dot (`LinkHint`) hangs into the gap (`margin-inline-end: -0.6em`) so it never wraps onto a blank line of its own under a name that just fits; a no-break space did not stop Chromium breaking before it. The row of other marks and the chips: the forms line sits 16px from the chips and from the jar rule (`$ingredient-card-forms-air`, `space(1)`, plus the 12px gap). A single long word breaks rather than overflows: `overflow-wrap: anywhere` on the block, and `hyphens: auto` on the name heading bar its first word, so a break shows a hyphen where the browser's dictionary can place one (the page's `lang` is `en`). Chromium, with no dictionary hit for an invented word such as "Nameicanicusmus", falls back to a plain break with no hyphen. The italic formal name gets no `hyphens`: binomials are Latin, and English hyphenation would split them oddly. No soft hyphens are ever inserted into the text.

## What the card is for

One ingredient in a list, for the public compendium and the coven's Ingredients page alike. Its name is the card's link, with a Quick Look eye at the foot's left on the coven's list. Beneath the name sit the formal name and the forms, which tell apart two entries that share a label, then the marks, and a slot for jar lines. The card is presentational: it takes props only and works out nothing from the data. The marks and the stock badge are each the project's one presentation, used as they are and never restyled here.

New or Updated sits just left of the safety badge in the card's top-right corner, or in the corner itself when there is no safety badge. `EntryMarks` draws it before the badges.

## The name and safety badge row

The name block and the safety badge share the top row until the name's first word no longer fits beside the badge. Only then does the badge wrap below. A flex row wraps on its items' narrowest widths, so the name block's narrowest width is made its first word's. It starts from a zero basis and grows into the spare room, and its content-based minimum (`min-width: auto`) is its min-content width. Every other word may break anywhere (`overflow-wrap: anywhere`), so it counts as no wider than a letter. The first word breaks only when it overflows (`break-word`) and never by the dictionary (`hyphens: manual`), so it counts whole. The badge row below counts as nothing. This keys the wrap on the first word, not on the longest word (which `flex-wrap` alone keys on) and not on the whole name (which `flex-basis: auto` keys on). `max-width` lets a first word wider than the card still break rather than spill. All of it is Baseline Widely Available.

## Compact density

The compact look is a mixin in `_compact.scss`, so a page can switch to it from its own selector. The card takes no density prop. The look must be switchable before React runs: a pre-paint script sets `data-card-density="regular"` on `<html>` from the stored choice, which the `:not()` on the selectors honours, and a prop would fix the look at render and mismatch on hydration. `index.scss` applies the mixin under `[data-density='compact']`, which `IngredientCardList` sets. Every rule is one class deeper than the one it overrides, so it wins wherever it is included.

What stays in compact: the content, the body order, the hover lift, and every target at 24px or more (the tip badges keep their height and only their sides tighten). Text goes one step down the type scale, to overline at the smallest.
