# IngredientCard

`src/components/IngredientCard/` — one ingredient in a list (M8.14, stories 20, 23
and 53). The one card serves the public compendium (M8.18) and the coven's
Ingredients page (M9.6). It is presentational: it takes props only and works out
nothing from the data.

## Props

`IngredientCardProps` (`types.ts`):

| Prop           | What it is                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `href`         | The entry's page (M8.19). The name links to it                                                                                       |
| `label`        | The label to show, already merged by the caller (`applyCupboardEntry`)                                                               |
| `formalName`   | The formal name, a caption beneath the name                                                                                          |
| `nomenclature` | Decides its italics: only a binomial kind (`isBinomial`, shared with the entry page) is italic; mineral, chemical or none is upright |
| `categories`   | The entry's categories with their groups; chips in the group colours, plain not links, no row when empty                             |
| `variants`     | The entry's live forms: an icon and the name each on the secondary line; their notes and flags feed the Caution and Toxic marks      |
| `toxic`        | The ingredient's own flag                                                                                                            |
| `safetyNotes`  | The ingredient's own safety notes; notes here or on a listed form show the Caution badge. The notes themselves are never drawn       |
| `kind`         | `own`, `cupboard` or `compendium`; see [`entry-marks.md`](entry-marks.md)                                                            |
| `annotated`    | The cupboard row overrides a field                                                                                                   |
| `retired`      | The curators retired the entry                                                                                                       |
| `level`        | The name's heading level, 2 to 5; Defaults to 2                                                                                      |
| `children`     | The jar-line slot, last (see the slot’s contract)                                                                                    |
| `actions`      | Buttons for the card's foot, right-aligned beneath the jar lines; they sit above the stretched link, so they press on their own      |

## What it is made of

The card owns layout and nothing else. Each treatment is used as it is and never
restyled here:

- the name, an `h2` holding the card's **one link**, so the card is reached by
  keyboard through it alone;
- the Foundations specimen layout (`.specimen` primitives): the name and formal name on the left, the marks on the right, then the category chips, the forms line (a `FormIcon` before each form, a dot between: "Herb · Oil"; it tells two entries sharing a label apart), and the jar lines;
- the marks, through `EntryMarks`, then `CautionMark`, then `ToxicMark` last, in `.specimen__badges`;
- no caution block: the notes live on the entry page, and the card carries only the Caution badge, a word with no tip, so Toxic stays the one solid badge;
- the **jar-line slot**. M9.6 fills it with a line per jar (the form's icon, the
  form, quantity and unit, M9.8's `StockBadge`, M9.9's and M9.10's actions). The
  public compendium leaves it empty.

The surface is `modal-surface($shadow-floating)`, not `.panel`. Order is top row, chips, forms, stock (changed 2026-10-18): the chips sit under the name and the forms line leads into the jar lines it describes, with the stock line last under its rule.

On the card only, Out of Stock takes Low's weight in the jar slot: a thin border,
the badge's normal font weight and padding, so both come out the same height. The
word and the icon still tell the states apart; the heavier edge is M9.8's for a
badge standing alone.
**The forms line's dot is drawn in CSS and never leads or ends a wrapped line.**
Each form after the first carries a `::before` circle (4px, `currentcolor`, so not
text and never announced) in the 24px margin to its left. The line has a matching
negative inline-start margin and a `clip-path` over that band, so a dot that would
start a wrapped line falls in the clipped band and a line never ends with one,
since each dot belongs to the form after it. A screen reader gets a
`.spoken-separator` comma in each item, so "Dried Leaf, Oil" is not run together;
the jar-line dot gets the same, and the slot's CSS takes that separator out of the flex flow (`position: absolute`) so the dot has the same gap either side: left to flow, it would add a gap of its own after the dot ("Dried Leaf· 6 g").
The Low badge's tip opens from the badge's right edge on the card only (`.ingredient-card .stock-badge__tip`, the same `tip-above($align: end)` the Retired tip uses), since the badge sits at the card's right edge and a left-anchored bubble would run off the screen; `StockBadge` keeps its own default elsewhere. Nothing focusable sits in the line, so the clip
cuts no focus ring.

### Sizes and padding (changed 2026-10-19)

The owner asked for smaller type, about half way to the compact look, with the spacing scaled to match but not compacted. Site tokens only. The name is `heading-size(3)` (1.8rem, was the `h2` default 2.15rem); the forms line is `type-size('small')` (0.875rem, was 1rem; its icons are in `em` and follow). Chip and badge text (the marks, Caution, Toxic, Low and Out of Stock) is `type-size('overline')` (0.75rem, was caption 0.8125rem), ; the badges take the `medium` badge size ([`styling.md`](../styling.md), "Badge sizes"), which holds them at 24px. Their padding and gaps stay. The formal name and jar lines keep their sizes. Card padding is `space(4)` (16px, was 24px); the forms line's air `space(1)` (4px, was 8px); the badge group's air below it `space(1)` (4px, was 8px). The card's own 12px gap, the 24px dot gap in the forms line and the 24px badges are unchanged.

### Compact

The same card in a tighter look, for a long list. It is not a prop. The look must be switchable before React runs (M9.6 stores the choice and a script sets an attribute before the first paint), and a prop fixes the look at render, which would then disagree with the server's markup on hydration. So the look is a Sass mixin, `ingredient-card-compact` (`_compact.scss`), applied in `index.scss` under `[data-density='compact']`: it applies wherever an ancestor carries that attribute. `IngredientCardList` sets it from its `density` prop; a card on its own is wrapped in an element that carries it (stories `Compact`, `Compact Long Name`).

What it changes: card padding `space(3) space(4)`, the card's gap `space(2)`, the name `heading-size(4)`, the formal name, chips and badges at overline, badges at the `small` size, tighter gaps between and inside the chips, the forms line at `small` with a `space(4)` dot gap, and `space(2)` above the foot and the jar lines. What it keeps: the content, the order, the hover lift, and every target at 24px or more. Each rule is one class deeper than the rule it overrides, which is how it wins. The regular card is used by the compendium (M8.18); the Ingredients page (M9.6) defaults to compact. M8.14 makes compact a real option and builds no switch.

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
click. The name is `$text-primary` with no underline, at rest or on hover; the card shows the
pointer, and the focus ring is drawn on the overlay,
round the card. Under the pointer, or with focus inside it, the card lightens
(`$surface-card-hover`: a step lighter in dark, brighter in light) and rises 2px
with a stronger shadow (`$shadow-lifted`, between floating and elevated), over 150ms.
Under reduced motion the move and the fade go and the colour and shadow change
stay. The lift moves `inset-block-start`, never `transform`: a transformed ancestor becomes the
containing block of the `position: fixed` tip bubbles inside the card, and Floating UI does not
re-place a bubble when an ancestor's transform starts or ends, so a quick move between cards left
a bubble in the wrong place. Keep `transform`, `filter`, `will-change`, `contain` and
`backdrop-filter` off the card for the same reason. Each card is `isolation: isolate`, so its raised
actions and tips stay inside it, and the card under the pointer or with focus inside it (or with
one of its tips still open, through `:has()`, since a tip lingers about 150ms after the pointer
leaves) takes `z-index: 1`, so its tips paint over the cards before and after it. The lift uses
`:focus-within`, so a click's focus lifts it too.
Muted jar text on the hovered card measures 7.99:1 dark and 6.95:1 light. A cost accepted: text in the card is harder to select, since a
drag starts on the overlay.

The foot (`.specimen__foot`) holds the jar lines and then the actions, and sits at the card's bottom, so cards of one grid row share a bottom line. The jar lines take the `small` size in the muted ink of the `.specimen__stock` primitive, its opacity reset so the badges keep their own inks.

## Order

The card declares no sort. Two rows sharing a label keep a stable order through
the `(name, id)` keyset the list pages on
([`../db/compendium-read.md`](../db/compendium-read.md)), asserted in
`tests/db/repository/ingredients.test.ts`.

Hyphenation is the browser's dictionary alone (owner's ruling, 2026-10-18): `hyphens: auto` with `overflow-wrap: anywhere` as the fallback where the dictionary has no word. No library and no soft hyphens.

Foundations (`.ladle/foundations.tsx`, "An Ingredient Card") renders this component itself, from invented sample data and the shared `Jars` story fixture, so its look cannot drift from the card's. The `.specimen*` classes are still the card's styling source, in `_primitives.scss`.

## Accessibility

Meaning is carried by words and shape, never colour alone: every badge has its
text. The page that places the card (M8.18, M9.6) owns the axe run and the
keyboard walk in its Playwright spec, since the card has no page of its own.
Styling stops at the tokens until the section's design review (MB.84).

### A long name

The top row (`.specimen__top`) wraps, in the primitive, so it holds wherever the primitive is used. The name block (`.ingredient-card__heading`) takes the room it needs and may shrink below its longest word; when it and the badges do not fit side by side, the badge group wraps onto its own row beneath, at the left (the name block grows, so beside it the badges sit at the right; the group itself takes only its content's width, with no auto margin). Badges that wrap among themselves start each row at the left, beside the name as under it (changed 2026-10-18: CSS cannot tell the two apart, and a full-width group wrapping within itself had its rows start part-way across the card). The wrapped group is 12px (`space(3)`, the row gap) below the formal name and 16px above the chips (the 12px card gap plus `space(1)` on the group). The forms line sits 16px from the chips and from the jar rule (`$ingredient-card-forms-air`, `space(1)`, plus the 12px gap). A single long word breaks rather than overflows: `overflow-wrap: anywhere` on the block, and `hyphens: auto` on the name heading only, so a break shows a hyphen where the browser's dictionary can place one (the page's `lang` is `en`). Chromium, with no dictionary hit for an invented word such as "Nameicanicusmus", falls back to a plain break with no hyphen. The italic formal name gets no `hyphens`: binomials are Latin, and English hyphenation would split them oddly. No soft hyphens are ever inserted into the text.
