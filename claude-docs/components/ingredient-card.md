# IngredientCard

`src/components/IngredientCard/` is one ingredient in a list (stories 20, 23 and 53), for the public compendium and the coven's Ingredients page, through [`ingredient-card-list.md`](ingredient-card-list.md). It is presentational: props only (`types.ts`), nothing worked out from the data. The caller merges a cupboard entry's label (`applyCupboardEntry`) and works out `recency` and `lastEdit`.

## Contracts

**Content and marks**

- The name is an `h2` holding the card's **one link**, a `PendingLink` naming the page it draws (`ingredientLinkTarget`, [`loading.md`](../loading.md)), so both lists show the entry page's own skeleton while it loads. It ends with a `LinkHint` ([`link-hint.md`](link-hint.md)) because entry pages cannot have a route `loading.tsx`.
- The card owns layout and nothing else. Marks, chips and stock badges are each the project's one presentation, never restyled here.
- `nomenclature` decides italics: only a binomial kind (`isBinomial`, shared with the entry page) is italic.
- The forms line puts a `FormIcon` before each form, which tells two entries sharing a label apart. `forms={false}` turns it off; the coven's cards do, because their jar lines and Quick Look already name every form. The variants still feed the safety badge.
- Categories are the shared `CategoryChips` ([`category-chips.md`](category-chips.md)) at the **full** chip level (`claude-docs/styling.md`, "Category chips"). The **quiet** level stays for the +N button only, because it is a control and not a category. The card carries no chip logic of its own.
- There is no caution block: the notes live on the entry page. The card carries only the Caution badge, a word with no tip, so Toxic stays the one solid badge.
- **Marks.** The safety badge (`SafetyMark`; [`safety-note.md`](safety-note.md)) sits in `.ingredient-card__corner`, drawn by a second `EntryMarks` given no kind mark and no provenance. `RecencyMark` sits just left of it, and takes the corner itself when there is no safety badge. Every other mark (Local, Retired) is a row under the formal name, with `safety={false}`, green first ([`entry-marks.md`](entry-marks.md), "The order"). The card never shows Compendium or Annotated: where a held entry came from is the entry page's to say, so there is no `annotated` prop. The corner comes last in the document, so it reads after the name block and lands correctly when it wraps.
- **Stock badges** are icon-only squares in the jars' colours ([`stock-badge.md`](stock-badge.md)), not `.badge`s, so the card's badge sizes do not reach them. Their tips open to the badge's left (`IconTip`'s default `side`), keeping the bubble on the card. `.ingredient-card .specimen__stock .icon-tip` lifts the badge above the link overlay so it keeps its own hover and focus.
- **Slots.** `children` takes a line per jar on the coven's page ([`jar-shelf.md`](jar-shelf.md#jar-lines)); the public compendium leaves it empty. `lastEdit` is drawn by `LastEdit` ([`last-edit.md`](last-edit.md)) above the actions; none draws no line. `startActions` render first in the actions row and stay left (the coven's Quick Look eye) while `actions` sit right.
- The foot sits at the card's bottom so cards of one grid row share a bottom line.
- The card declares no sort. Two rows sharing a label keep a stable order through the `(name, id)` keyset the list pages on ([`../db/compendium-read.md`](../db/compendium-read.md)), asserted in `tests/db/repository/ingredients.test.ts`.

**The forms line's dot**

- The dot is drawn in CSS through the shared `dotted-row` mixin ([`styling.md`](../styling.md), "Dotted lists"), which the admin Compendium's Form cell also uses, so it never leads or ends a wrapped line. Because it is not text it is never announced; a `.spoken-separator` comma in each item stops "Dried Leaf, Oil" running together. The jar-line dot gets the same comma, and the slot's CSS takes that separator out of the flex flow (`position: absolute`) so the dot has the same gap either side; left to flow, it would add a gap of its own ("Dried Leaf· 6 g").
- Nothing but the stock badges is focusable in the line, so the mixin's clip cuts no focus ring.

**The safety badge beside the name**

- The specimen tops the name and badges flush, so the 24px badge would sit above the middle of the taller name line. The corner is a badge tall even holding New or Updated alone, and its top margin is half the name's line box less the badge's height. The line box is the size times 1.15, so that is `heading-size(3)` in the regular card and `heading-size(4)` in compact.

**The whole card is the link**

- The name's one `<a>` stretches an empty `::after` over the `article` (the stretched-link pattern). The card is not wrapped in an `<a>`: a screen reader would read the whole card as the link's name, and a link cannot hold the Low badge's button. So the accessible name stays the ingredient's name and the card has exactly one link.
- Anything that would paint above the overlay without a control to press passes the click through with `pointer-events: none`, so a press goes to the entry: each plain category chip's `li` (a chip with a tip is a button: CategoryChips gives it the pointer back); the forms line, whose `dotted-row` (`clip-path`, relative items) would otherwise paint above the overlay; `.specimen__stock` and `.recency-mark`, whose list reset and optical nudge make them relative; and the actions row, which stays raised (`z-index: 1`) while each of its children, and each child of its start group, takes the pointer back. Raising the overlay instead would cover the badge, marks and actions.
- These keep their own press and never open the entry: the +N button, a category chip with a tip, the Low and Out of Stock badges (their tip anchor is raised), the tipped marks (Retired, Annotated), the last-edit line, and every button and link in the foot.
- The cost: text on the card cannot be selected by dragging, since a drag that starts off a control starts on the link.

**A long name**

- `.specimen__top` holds the name block (`.ingredient-card__heading`) and the corner. **The corner stays beside the name until the name's first word no longer fits beside it, then wraps below the block, at the left.**
- A flex row wraps on its items' widths, so the block's width is made its first word's: `flex: 1 1 0` from a zero basis, with the default `min-width: auto`, whose content-based minimum is the block's min-content width. The first word is its own span (`.ingredient-card__first`, split from the label in `index.tsx`) with `overflow-wrap: break-word` and `hyphens: manual`, so it counts whole. Every other word keeps `overflow-wrap: anywhere`, which counts it as one letter wide. The badge row under the formal name has `inline-size: 0; min-inline-size: 100%`, so its badges count as nothing. All of it is Baseline Widely Available.
- The pending dot hangs into the gap (`margin-inline-end: -0.6em`) so it never wraps onto a blank line of its own under a name that just fits; a no-break space did not stop Chromium breaking before it.
- Hyphenation is the browser's dictionary alone (`hyphens: auto`, the page's `lang` is `en`), with `overflow-wrap: anywhere` where it has no word; an invented word such as "Nameicanicusmus" breaks plainly. No library and no soft hyphens. The italic formal name gets no `hyphens`, because English hyphenation would split Latin binomials oddly.

**Compact**

- Compact is not a prop. The look must be switchable before React runs (a script sets an attribute before first paint), and a prop fixes the look at render, which would disagree with the server's markup on hydration. So it is the Sass mixin `ingredient-card-compact` (`_compact.scss`), applied under `[data-density='compact']:not(:root[data-card-density='regular'] *)`: wherever an ancestor carries the first attribute, unless `<html>` carries `data-card-density="regular"`, which the pre-paint script sets from the stored Compact choice ([`card-density-switch.md`](card-density-switch.md)).
- `IngredientCardList` sets `data-density` from its `density` prop; a card on its own is wrapped in an element that carries it (stories `Compact`, `Compact Long Name`). The regular card is the compendium's; the Ingredients page defaults to compact.
- It keeps the content, the order, the drawer slide and every target at 24px or more (the tip badges keep their height and only their sides tighten). Each rule is one class deeper than the rule it overrides, which is how it wins. The shared padding, title, badge and chip rules are scoped to `.ingredient-card`, so another specimen inside a compact list (a Quick Look's badges) keeps its own size.

**The drawer**

The card is drawn as the front of an apothecary drawer. `.ingredient-card-slot` is the hole in the cabinet and never moves; under the pointer, or with focus inside it, the card's face lightens, deepens its shadow and slides down to reveal the drawer body, an `aria-hidden` sibling painted first.

- **The slot clips nothing itself**, because a `clip-path` or `overflow` on an ancestor of the card would cut off the tips and the category panel that open above the card's top edge. The hover is read from the slot, not the card: the face leaves the pointer's place as it moves, and the slot stays put, so the card does not flicker. `:focus-within` means a click's focus opens it too.
- **A sibling painted first, not a negative `z-index` child.** A negative `z-index` child paints over its parent's own background, which put the box in front of the card.
- **Offset, not `transform`.** The slide moves `inset-block-start`: a transformed ancestor becomes the containing block of the `position: fixed` tip bubbles inside the card, and Floating UI does not re-place a bubble when an ancestor's transform starts or ends, so a quick move between cards left a bubble misplaced. Keep `transform`, `filter`, `will-change`, `contain` and `backdrop-filter` off the card for the same reason.
- **Colours** are per-theme tokens (`--drawer-*`, `color.mix()` in `_variables.scss`). Dark's back wall sits almost on the page, so the drawer reads mostly through its sides and shading. Light's shading is iron-gall at a lower alpha than dark's black, which keeps it in the palette: the dark strengths over a light floor read as a hole.
- **Reduced motion.** Nothing moves and nothing fades, so the drawer stays hidden; the colour and shadow change stay.
- **The stack.** The card keeps `isolation: isolate` and the slot makes no stacking context, so the open card (or one with a tip still open, through `:has()`, since a tip lingers about 150ms after the pointer leaves, or a category panel open) takes `z-index: 1` among its neighbours and its tips paint over the cards before and after it.

**Phone and forced colours**

- On a phone the card has no rule of its own: the list gives it the full width ([`ingredient-card-list.md`](ingredient-card-list.md)).
- The card's edge is `modal-surface`'s shadow, which forced colours drops, so there the card takes a 1px `CanvasText` border, moving its content 1px inward there only. Under a pointer that can hover, the hovered slot turns the border `Highlight`, since the lift's fill and shadow are dropped and reduced motion removes the slide. Focus is the shared ring, an outline, which forced colours keeps.

**Accessibility**

- Meaning is carried by words and shape, never colour alone: every badge has its text. The page that places the card owns the axe run and the keyboard walk in its Playwright spec, since the card has no page of its own.

## What the page sends

`index.tsx` is a server component that passes the props on to `CardFace` (`face.tsx`), a client component that draws the card, so React's data for the browser carries each card once as its props and not as its drawn element tree.

- The wrapper reduces the props to what the face shows. Safety notes, the entry's and each form's, become `'*'`, or `null` for none, because the card shows only a Caution badge. Each variant keeps only its form, its group's icon, and whether it is toxic or has notes.
- `categories` may name a category by id alone (`CardCategoryRef`), and the face then reads its name and group colours from the `CardCategoryVocabulary` (`category-vocabulary.tsx`) the list wraps around its cards. The public compendium and coven ingredients pages send every category the vocabulary holds this way (`categoryRefs`, `category-refs.ts`), and a category it does not hold whole.
- Whatever a page passes in `actions`, `startActions` and the jar slot is sent as it is drawn.
- `tests/rsc/app/(public)/compendium/page.test.tsx` checks that the face is a client reference and that no notes text is in its props. The choice and its cost are in [`ui.md`, "The compendium page sends each thing once"](../design-decisions/ui.md#the-compendium-page-sends-each-thing-once).

## Styling

`index.scss` holds the card, its slot and the drawer. The shared `.specimen*` primitives it builds on are in `_primitives.scss`, which stays the card's styling source for Foundations (`.storybook/foundations.tsx`, "An Ingredient Card"); Foundations renders this component itself from invented data and the shared `Jars` story fixture, so the look cannot drift.

What SpellCard shares with this card is written once in `_specimen-card.scss`: `specimen-card()` and `specimen-card-compact()`. Each card passes its own class names; the corner, formal name, forms line and jar lines stay in this card's own files.

## Tests

Stories are in `index.stories.tsx` (`Ingredients / Ingredient Card`, one `States` grid). Tests are in `tests/components/IngredientCard/`. Layout and the drawer's look are not tested in jsdom, which has no layout. Whether a press reaches the overlay is proved in a browser by `tests/e2e/card-click.spec.ts`: it presses each card on the formal name, its padding, the gap between the foot's controls, the New mark (on `/compendium`) and a jar line's words (on a coven's Ingredients page), checking first that the point is off every link and button, and expects the entry. It presses the +N, Quick Look, the plus, Edit Stock and the Low badge and expects each to keep its own action. It checks the card has one link to the entry, named by the ingredient's name, the tab order, and that every control but the name is at least 24 by 24, the last-edit line's button included.
