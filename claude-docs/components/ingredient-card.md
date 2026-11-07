# IngredientCard

`src/components/IngredientCard/` is one ingredient in a list (stories 20, 23 and 53). The one card serves the public compendium and the coven's Ingredients page. It is presentational: it takes props only and works out nothing from the data. Its props are in `types.ts`.

## Contracts

**Content and marks**

- The name is an `h2` holding the card's **one link**, so the card is reached by keyboard through it alone. The link is a `PendingLink` naming the page it draws (`ingredientLinkTarget`, [`loading.md`](../loading.md)), so both lists show the entry page's own skeleton while it loads. It ends with a `LinkHint` ([`link-hint.md`](link-hint.md)), a dot that pulses while the page loads, because entry pages cannot have a route `loading.tsx`. The dot is `aria-hidden`, so the link is named by the label alone.
- The card owns layout and nothing else. The marks, chips and stock badges are each the project's one presentation, used as they are and never restyled here.
- Top to bottom: the top row (name and formal name on the left, the corner on the right), the category chips, the forms line, then the foot (jar lines, last-edit line, actions). The surface is `modal-surface($shadow-floating)`, not `.panel`.
- `nomenclature` decides italics: only a binomial kind (`isBinomial`, shared with the entry page) is italic.
- The forms line is a `FormIcon` before each form with a dot between ("Herb · Oil"), which tells two entries sharing a label apart. The `forms` prop turns it off; the coven's cards do, because their jar lines and Quick Look already name every form. The variants still feed the safety badge.
- The category chips come from the shared `CategoryChips` ([`category-chips.md`](category-chips.md)): the entry's own categories, then those only its forms carry (a dashed border, its tip naming the forms). They are the **full** chip level (a wash, border and label in the group colour, no dot; `claude-docs/styling.md`, "Category chips"). Plain chips are not links, and no row is drawn when there are none. The **quiet** level stays for the +N button only, because it is a control and not a category.
- The card shows the first `CATEGORY_CHIP_LIMIT` chips (2, `CategoryChips/constants.ts`).
- The rest sit behind the +N button (`CategoryChips/category-more.tsx`, a client child, so the card stays server-compatible). Focus opens a panel of the remaining chips at once, hover after the tips' 300ms wait; a click pins it and a second click closes it; Escape closes it and returns focus to the button; a press outside, or leaving after a 120ms grace (WCAG 1.4.13), closes it.
- The panel is `position: fixed`, placed by Floating UI as wide as the row (at least 12rem), hangs below the chip row over the forms and jar lines so the card's height never changes, may flip above near the window's foot, and fades at `$tip-fade` (500ms, dropped under reduced motion). The card rises above its neighbours while it is open, with `isolation` and `z-index` and no transform. The button's name carries the count (`3 more categories for Testwort`).
- There is no caution block: the notes live on the entry page. The card carries only the Caution badge, a word with no tip, so Toxic stays the one solid badge. Notes on the ingredient or a listed form show Caution unless Toxic shows.
- The marks sit in two places.
  - The safety badge (`SafetyMark`: Toxic, or else Caution; [`safety-note.md`](safety-note.md)) sits in `.ingredient-card__corner`, drawn by a second `EntryMarks` given no kind mark and no provenance. The corner is always at the card's top-right beside the name, with nothing to its right.
  - `RecencyMark` (New or Updated, from `recency`, which the list page works out from the entry's stamps) sits just left of it on the same line, and takes the corner itself when there is no safety badge. The corner is drawn when either shows.
  - Every other mark (Local, Retired) is a row under the formal name, drawn by `EntryMarks` in `.specimen__badges` with `safety={false}`, green first ([`entry-marks.md`](entry-marks.md), "The order").
  - The card never shows Compendium or Annotated (`provenance={false}`): where a held entry came from is the entry page's to say, so there is no `annotated` prop.
  - In the document the corner comes last, after the name, the formal name and the row, so it reads after the name block and lands correctly when it wraps.
- The stock badges are icon-only squares with no box, in the jars' colours ([`stock-badge.md`](stock-badge.md)). They are not `.badge`s, so the card's badge sizes do not reach them. Their tips are icon tips that open to the badge's left (`IconTip`'s default `side`), keeping the bubble on the card. `.ingredient-card .specimen__stock .icon-tip` lifts the badge above the link overlay so it keeps its own hover and focus.
- The **jar-line slot** (`children`) takes a line per jar on the coven's page ([`jar-shelf.md`](jar-shelf.md#jar-lines)); the public compendium leaves it empty. The jar lines use the `small` size in the muted ink of the `.specimen__stock` primitive, with its opacity reset so the badges keep their own inks.
- `lastEdit` is drawn by `LastEdit` ([`last-edit.md`](last-edit.md)) in the foot, under the jar lines and directly above the actions, left-aligned. The caller works it out; none draws no line.
- The foot (`.specimen__foot`) holds the jar lines and then the actions, sits at the card's bottom so cards of one grid row share a bottom line, and shows when there are jars, actions or start actions.
- `startActions` render first in the actions row, in `.specimen__actions-start`, whose `margin-inline-end: auto` keeps them at the left and pushes `actions` right. The coven's Quick Look eye sits there, with More and a pencil at the right. The start is a flex row of its own, not a line of text, and `align-items: center` on `.specimen__actions` centres every control.
- The card declares no sort. Two rows sharing a label keep a stable order through the `(name, id)` keyset the list pages on ([`../db/compendium-read.md`](../db/compendium-read.md)), asserted in `tests/db/repository/ingredients.test.ts`.
- Hyphenation is the browser's dictionary alone: `hyphens: auto` with `overflow-wrap: anywhere` as the fallback where the dictionary has no word. No library and no soft hyphens.

**The forms line's dot**

- The dot is drawn in CSS and never leads or ends a wrapped line, through the shared `dotted-row` mixin ([`styling.md`](../styling.md), "Dotted lists"), which the admin Compendium's Form cell also uses.
- Each form after the first carries a `::before` circle (4px, `currentcolor`, so not text and never announced) in the 24px margin to its left. The line has a matching negative inline-start margin and a `clip-path` over that band, so a dot that would start a wrapped line falls in the clipped band, and a line never ends with one, since each dot belongs to the form after it.
- A screen reader gets a `.spoken-separator` comma in each item, so "Dried Leaf, Oil" is not run together. The jar-line dot gets the same, and the slot's CSS takes that separator out of the flex flow (`position: absolute`) so the dot has the same gap either side; left to flow, it would add a gap of its own ("Dried Leaf· 6 g").
- Nothing but the stock badges is focusable in the line, so the clip cuts no focus ring.

**Sizes and spacing** (site tokens only)

- The name is `heading-size(3)`; the forms line is `type-size('small')` (its icons are in `em` and follow); chip and badge text (marks, Caution, Toxic, Low, Out of Stock) is `type-size('overline')`, with the `medium` badge size ([`styling.md`](../styling.md), "Badge sizes"), which holds them at 24px. The formal name and jar lines keep their sizes.
- Card padding is `space(4)`; the forms line's air and the badge group's air below it are `space(1)`. The card's own 12px gap, the 24px dot gap in the forms line and the 24px badges are fixed.
- Jar section gaps (px): between two jar lines 8; forms line (or chips) to the rule above 24; rule to the first jar line 12; last jar line to the card's bottom edge 32.
- The row under the formal name is `space(2)` below it (`space(1)` compact).

**The safety badge beside the name**

- The specimen tops the name and badges flush (`align-items: flex-start`), so the 24px badges would sit above the middle of the taller name line. The corner is a badge tall even holding New or Updated alone, and has a top margin of half the name's line box less the badge's height. The line box is the size times 1.15, so that is `heading-size(3)` in the regular card and `heading-size(4)` in compact.

**The whole card is the link**

- The name's one `<a>` stretches an empty `::after` over the `article` (`position: relative`), the stretched-link pattern. The card is not wrapped in an `<a>`: a screen reader would read the whole card as the link's name, and a link cannot hold the Low badge's button. So the accessible name stays the ingredient's name and the card has exactly one link.
- The name is `$text-primary` with no underline at rest or on hover; a card whose name links shows the pointer, and the focus ring is drawn on the overlay, round the card.
- Anything that would paint above the overlay without a control to press passes the click through with `pointer-events: none`, so a press goes to the entry:
  - each plain category chip's `li` (a chip with a tip is a button: CategoryChips raises it and gives it the pointer back);
  - the forms line, whose `dotted-row` mixin (`clip-path`, relative items) would otherwise paint above the overlay (raising the overlay instead would cover the badge, marks and actions);
  - `.specimen__stock` and `.recency-mark`, whose list reset and optical nudge make them relative;
  - the actions row, which stays raised (`z-index: 1`) while each of its children, and each child of its start group, takes the pointer back, because each is a control or the wrapper its tip or menu opens in.
- These keep their own press and never open the entry: the +N button, a category chip with a tip, the Low and Out of Stock badges (their tip anchor is raised, `z-index: 1`), the tipped marks (Retired, Annotated), the last-edit line, and every button and link in the foot.
- The cost: text on the card cannot be selected by dragging, since a drag that starts off a control starts on the link.

**A long name**

- `.specimen__top` wraps, in the primitive. On the card it holds the name block (`.ingredient-card__heading`: the name, the formal name and the row of other marks) and the corner. **The corner stays beside the name until the name's first word no longer fits beside it, then wraps below the block, at the left.**
- A flex row wraps on its items' widths, so the block's width is made its first word's: `flex: 1 1 0` from a zero basis, with the default `min-width: auto`, whose content-based minimum is the block's min-content width. The first word is its own span (`.ingredient-card__first`, split from the label in `index.tsx`) with `overflow-wrap: break-word` and `hyphens: manual`, so it counts whole. Every other word keeps `overflow-wrap: anywhere`, which counts it as one letter wide. The row under the formal name has `inline-size: 0; min-inline-size: 100%`, so its badges count as nothing. `max-width: 100%` lets a first word wider than the card still break rather than spill. All of it is Baseline Widely Available.
- The pending dot (`LinkHint`) hangs into the gap (`margin-inline-end: -0.6em`) so it never wraps onto a blank line of its own under a name that just fits; a no-break space did not stop Chromium breaking before it.
- The forms line sits 16px from the chips and from the jar rule (`$ingredient-card-forms-air`, `space(1)`, plus the 12px gap).
- A single long word breaks rather than overflows: `overflow-wrap: anywhere` on the block, and `hyphens: auto` on the name heading except its first word, so a break shows a hyphen where the browser's dictionary can place one (the page's `lang` is `en`). With no dictionary hit for an invented word such as "Nameicanicusmus", Chromium breaks plainly. The italic formal name gets no `hyphens`, because English hyphenation would split Latin binomials oddly.

**Compact**

- Compact is not a prop. The look must be switchable before React runs (a script sets an attribute before first paint), and a prop fixes the look at render, which would disagree with the server's markup on hydration. So it is the Sass mixin `ingredient-card-compact` (`_compact.scss`), applied in `index.scss` under `[data-density='compact']:not(:root[data-card-density='regular'] *)`: wherever an ancestor carries the first attribute, unless `<html>` carries `data-card-density="regular"`, which the pre-paint script sets from the stored Compact choice ([`card-density-switch.md`](card-density-switch.md)).
- `IngredientCardList` sets `data-density` from its `density` prop; a card on its own is wrapped in an element that carries it (stories `Compact`, `Compact Long Name`). The regular card is the compendium's; the Ingredients page defaults to compact.
- It changes: card padding `space(3) space(4)`, the card's gap `space(2)`, the name `heading-size(4)`, the formal name, chips and badges at overline, badges at the `small` size, tighter gaps in and between chips, the forms line at `small` with a `space(4)` dot gap, and `space(2)` above the foot and the jar lines. Its padding, title, badge and chip rules are `specimen-card-compact()` from `_specimen-card.scss`, scoped to `.ingredient-card`, so another specimen inside a compact list (a Quick Look's badges) keeps its own size.
- It keeps the content, the order, the drawer slide and every target at 24px or more (the tip badges keep their height and only their sides tighten). Each rule is one class deeper than the rule it overrides, which is how it wins.

**The drawer**

The card is drawn as the front of an apothecary drawer.

- **The slot.** The component wraps the card in `.ingredient-card-slot`, the hole in the cabinet. It fills the list item's cell, is rounded like the card, and has the slot's interior colour and a soft inset shadow. It never moves. It clips nothing itself, because a `clip-path` or `overflow` on an ancestor of the card would cut off the tips and the category panel that open above the card's top edge.
- **The slide.** Under the pointer, or with focus inside the slot, the card's face lightens (`$surface-card-hover`), takes a deeper shadow (`$shadow-lifted`) and slides 11px down (`$drawer-travel`) over 300ms (`$motion-medium`). The hover is read from the slot, not the card: the face leaves the pointer's place as it moves, and the slot stays put, so the card does not flicker. `:focus-within` means a click's focus opens it too.
- **The drawer body.** Behind the face sits `.ingredient-card-slot__drawer`, an `aria-hidden` span that only clips, with its `::before` as the box: 10px in from each side of the slot, square-cornered, from 1px below the slot's top to 10px under the face at full travel, so no gap shows. At rest it sits one travel higher, hidden by the clip. Layers, top first: the shadow the face casts (dark for the 10px under it, fading out by 22px), 10px shading bands on each side, 7px side walls, the back wall (top 38%), a seam easing into the floor (to 48%), and the floor.
- **Why a sibling painted first, not a negative `z-index` child.** A negative `z-index` child paints over its parent's own background, which put the box in front of the card. The drawer is a sibling before the card in the DOM, so the card paints over it.
- **Why offset and not `transform`.** The slide moves `inset-block-start`: a transformed ancestor becomes the containing block of the `position: fixed` tip bubbles inside the card, and Floating UI does not re-place a bubble when an ancestor's transform starts or ends, so a quick move between cards left a bubble misplaced. Keep `transform`, `filter`, `will-change`, `contain` and `backdrop-filter` off the card for the same reason.
- **Colours.** `--drawer-slot`, `--drawer-floor`, `--drawer-side`, `--drawer-back` and `--drawer-seam` are set per theme with the other surface colours, each a `color.mix()` in `_variables.scss`. Light stirs iron-gall into parchment (floor 9%, sides 18%, slot 25%, back 35%). Dark stirs chalk into soot (floor 17%, sides 25%, back 2%), and its slot is soot and the dark shadow ink in equal parts; the back wall sits almost on the page, so the drawer reads mostly through its sides and shading.
- **Shading.** The face's cast shadow and the 10px side washes are theme tokens: `--drawer-shade`, `--drawer-shade-fade` and `--drawer-shade-edge`. Dark keeps black at 0.5, 0.45 and 0.22, as the site's shadows do. Light uses iron-gall at alpha 0.22, 0.2 and 0.12, which stays in the palette and is lighter: the dark strengths over a light floor read as a hole.
- **Reduced motion.** Nothing moves and nothing fades, so the drawer stays hidden; the colour and shadow change stay.
- **The stack.** The card keeps `isolation: isolate`. The slot makes no stacking context, so the open card (or one with a tip still open, through `:has()`, since a tip lingers about 150ms after the pointer leaves) takes `z-index: 1` among its neighbours and its tips paint over the cards before and after it.

**Phone and forced colours**

- On a phone the card has no rule of its own: the list gives it the full width, one card across ([`ingredient-card-list.md`](ingredient-card-list.md)), and a long name wraps.
- The card's edge is `modal-surface`'s shadow, which forced colours drops, so under forced colours the card takes a 1px `CanvasText` border, which moves its content 1px inward there only. Under a pointer that can hover, the hovered slot turns the card's border `Highlight`, since the lift's fill and shadow are dropped and reduced motion removes the slide. Focus is the shared ring, an outline, which forced colours keeps. Badges and chips keep their 1px borders, and icons are drawn in `currentColor`.

**Accessibility**

- Meaning is carried by words and shape, never colour alone: every badge has its text. The page that places the card owns the axe run and the keyboard walk in its Playwright spec, since the card has no page of its own.

## Styling

`index.scss` holds the card, its slot and the drawer. The shared `.specimen*` primitives it builds on are in `_primitives.scss`, which stays the card's styling source for Foundations (`.storybook/foundations.tsx`, "An Ingredient Card"); Foundations renders this component itself from invented data and the shared `Jars` story fixture, so the look cannot drift.

What SpellCard shares with this card is written once in `_specimen-card.scss`: `specimen-card()` (the name's link stretched through `card-link()`, the pointer on a card whose name links, the title block, the badge row, the medium badge size and the plain chips passing a click through) and `specimen-card-compact()`. Each card passes its own class names; the corner, formal name, forms line and jar lines stay in this card's own files.

## Used by

The public compendium list and the coven's Ingredients page, through [`ingredient-card-list.md`](ingredient-card-list.md).

## Not here

- Stock badges, marks and chips are drawn by their own components.
- Merging a cupboard entry's label (`applyCupboardEntry`), recency and last-edit are worked out by the caller.

Stories are in `index.stories.tsx` (`Ingredients / Ingredient Card`, one `States` grid). Tests are in `tests/components/IngredientCard/`. Layout and the drawer's look are not tested in jsdom, which has no layout. Whether a press reaches the overlay is proved in a browser by `tests/e2e/card-click.spec.ts`: it presses each card on the formal name, its padding, the gap between the foot's controls, the New mark (on `/compendium`) and a jar line's words (on a coven's Ingredients page), checking first that the point is off every link and button, and expects the entry. It presses the +N, Quick Look, the plus, Edit Stock and the Low badge and expects each to keep its own action. It checks the card has one link to the entry, named by the ingredient's name, the tab order, and that every control but the name is at least 24 by 24, the last-edit line's button included.
