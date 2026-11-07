# JarShelf

`src/components/JarShelf/` is a shelf of small drawn jars, one for each form of an ingredient, on the entry page's Stock section. It shows at a glance what the coven holds of each form. For a role that may edit stock, each jar is also a button that opens Edit Stock on that form ([`stock-dialog.md`](stock-dialog.md)). The drawing is the approved "Fillets" mock: a thin plank with a curved bracket at each end. It has no idle motion; the only movements are the level's rise when an amount changes and the hover on an editable jar. Both are off under `prefers-reduced-motion`, bar the name's change of size.

This doc also covers `JarLine` and `JarLines`, which draw jars in lists.

## Contracts

**Props** (`types.ts`: `forms`, `seed`, optional `edit`)

- The shelf draws `forms` in the order given and sorts nothing: the entry's Stock section ([`ingredient-entry.md`](ingredient-entry.md), "Stock") puts forms with a jar first and those with none after, each group in the forms' order. A jar holding 0 is a jar, so an Out jar keeps its place among the held ones. A form with no jar (`jar: null`) still has a place.
- `form` is the variant's form as stored; the shelf writes it through `formLabel`.
- `seed` is the entry's formal name (`canonicalName`), or its id when it has none. It is the formal name and not the coven's own label, so relabelling an entry does not change its shelf.
- `edit` is the `StockDialog` props. With it each jar is a button; without it the jars are plain figures. `stock-section.tsx` builds the props from the entry's variants and the coven's jars.

**Which vessel a form gets**

- `pick(seed, form)` in `pick.ts` joins the seed and form, trims and lower-cases them (so a change of case does not re-roll the vessel), hashes with djb2, and takes the result modulo the pool size. A form matching `LIQUID` (oil, tincture, essence, water, vinegar, syrup, extract, juice, elixir, infusion, hydrosol) picks from the four bottles; every other form from the seven jars.
- The same name and form always give the same vessel in every coven. Nothing is stored, so the pick is tested as a plain function.
- The module also exports `JarDrawing` (the drawing alone, level and tint) and `pickJarShape`. The spell builder's jar details reuse both ([`spell-builder.md`](spell-builder.md), "The jar details"), seeding a linked step's vessel with the ingredient id, so it can differ from the one the ingredient's own page shelves.

**The level**

`fillOf` in `level.ts` turns a jar into `{ level, mark }`, each a fraction of the glass (0 empty, 1 full); `mark` is where the dashed low-stock line sits.

| Jar                                 | Level                                     | Mark                                       |
| ----------------------------------- | ----------------------------------------- | ------------------------------------------ |
| Threshold above 0, quantity above 0 | `quantity / max(2 × threshold, quantity)` | `threshold / max(2 × threshold, quantity)` |
| Threshold above 0, quantity 0       | 0 (empty)                                 | `threshold / (2 × threshold)`, so half way |
| No threshold, quantity above 0      | 0.7                                       | none                                       |
| No threshold, quantity 0            | 0 (empty)                                 | none                                       |
| Unmeasured (`null`)                 | 0.7                                       | none                                       |

A jar at its threshold stands half full; at twice its threshold or more, full. An unmeasured jar stands at 0.7 so "held but not measured" is not read as empty. `lv(shape, level)` in `shapes.ts` maps the fraction onto the shape's glass: `40 − (40 − full) × level` in the drawing's 48 by 40 units.

TODO(owner): this rule is the builder's. The mock gave example heights only.

**The drawing**

- `shapes.ts` holds eleven shapes as data: `hex`, `mason`, `apoth`, `cork`, `clip`, `honey`, `cloth` (jars) and `bottle`, `flask`, `erlen`, `vial` (bottles). Each has its height, body outline, lid parts, optional extras, and a wave period and amplitude. The wave is drawn one period past each side of the 48-wide box so it could slide and still cover the body; the shelf does not slide it.
- The level is a rectangle clipped to the body's outline. The clip sits on an untransformed group around the group that moves, since a clip on a transformed element moves with it. The level is lifted by `translateY`, not by animating `y` and `height`, which Safari does not transition on SVG (`jar-shelf__rise`).
- Each drawing's clip has its own id from `useId`, as two on a page cannot share one.
- Colours are classes (`jar-shelf__glass`, `__lid`, `__level`, and so on) in `index.scss`, from tokens alone. Ink is the text colour; the level and wave are the accent. `bandInk` types the two custom properties because React types none.
- An empty jar (`jar-shelf__jar--empty`) draws dashed muted strokes and hides its cork and cloth.
- A **Low** or **Out** jar is told by the jar itself, not a boxed badge. The cell wears `jar-shelf__jar--low` or `--out`, from `stockState` ([`stock-badge.md`](stock-badge.md)); the rules come after the base paint so they win by order as well as by the extra class.
  - Low draws the glass, the level (at 30% opacity) and the wave in `$stock-low-ink`, the warning amber, with the threshold mark solid at stroke 1.4.
  - Out draws the glass, lid and facets as a solid outline in `$stock-out-ink`, never dashed, so it cannot read as the dashed outline of a form with no jar, with a faint tint of the same red (14% over transparent). The wave, mark, cork and cloth are left off, since an empty jar has no surface to ripple.
  - The amount under either is in the same colour at weight 500, with the badge's drawing before it (Low's double chevron or Out's slashed ring, `StockIcon`, 1em square, `.jar-shelf__amount-icon`). So the state is told by a symbol as well as colour (WCAG 1.4.1) and a Low jar reads the same here as on the card. There is no extra word. ([`mb.121-workspace-ingredients-review.md`](../design-decisions/mb.121-workspace-ingredients-review.md))
- A faceted jar's two bands (`__shade`, `__shine`) are made from the text and card colours with `color-mix`, since no token exists. In the dark theme the text colour is the light one, so the bands swap roles.
  - TODO(owner): say whether the bands should be tokens, one pair for each theme.

**Markup and accessibility**

- The shelf is a `ul` named **Jars**; each jar is an `li`. The SVG is `aria-hidden`; the form and amount beside it say all of it.
- Under the drawing: the form, then the amount ("250 g", a bare number, or **Unmeasured**), or **No Jar** for a form with none.
- **The amount button.** For a Low or Out jar the amount is a button that opens the badge's tip, in the badge's place. It looks like text (no box, no tint, the help cursor, the app's normal focus ring). It is the badge's `StockTip`, so `IconTip`'s: the tip opens after the pointer rests, at once on focus, and Escape closes it. Its words are the shared `stock-words.ts` ([`stock-badge.md`](stock-badge.md), "Shared words"). It is shown to an observer too.
  - Its accessible name is the amount and the state (**40 g, Low Stock**, **0 ml, Out of Stock**, **3, Low Stock** with no unit).
  - Low's description is **Low Stock at 50 g or less**, written once in a `.visually-hidden` span since the tip's bubble is hidden from a screen reader. Out has none, as it would repeat the name.
- For a role that may edit, the form's name is a button named **Edit Stock, <entry name>, <Form>**, an empty jar's too, since pressing it adds the form. It is stretched over the whole jar by its `::after`, so the jar is one target, with its focus ring on that `::after` (inset, so the first and last column's ring is not cut). The amount sits beside the button, not inside it, because a Low or Out amount is a button of its own and one button cannot hold another; it is raised (`z-index: 1`) so it can still be pressed.
- For an observer the jars are plain text: no button, no hover effect.
- The button is `StockJarButton` ([`stock-dialog.md`](stock-dialog.md)) with `openOn` set to the form's variant id, so the dialog opens with that form chosen. For an empty jar the dialog adds the form as a new row first, so it is dirty from the start (Save is on, Cancel asks before throwing the row away). The empty jar's button is named "Edit Stock" like the others, not "Add Stock".

**Shelf geometry and styling**

- Variables in `_variables.scss` (`$jar-top`, `$jar-drawing-width`, `$jar-drawing-height`, `$jar-plank`, `$jar-cell-min`, `$jar-cell-min-narrow`) are shared with the entry's loading skeleton. The drawing is 35.52 by 29.97 px; the plank is 1.5 px with 7 px brackets and sits at the foot of the drawing's box (the cell's top padding plus 29.97 px).
- The plank is a `linear-gradient` background on the cell and the fillets are radial gradients on its `::before` and `::after`, so each jar is one element. A fillet is a square at the plank's top with a quarter circle cut from its outer corner, so the plank curves down into a bracket. They replace `typography-base`'s diamond bullet; its shape is cleared first in the same rule.
- Each cell draws the halves of its two brackets just outside its own edges (`::before` at `left: -7px`, `::after` at `right: -7px`), so between two jars the halves meet in a full bracket.
- **The outer ends carry no fillet.** The shelf has `overflow-x: clip` and its columns have no gap and fill the width, so the first and last column of every row sit on its edge and the half drawn outside is cut off, on each visual row, with no script or row counting. The last cell has its `::after` left off (`:last-child`), because when it ends a short row it is not on the clipped edge.
- The clip is sideways only and `overflow: clip` makes no scroll box. Where it is not understood the outer halves simply show. The Low and Out tips are `position: fixed`, so they escape the clip. The cell's side padding is `space(2)`, so the name's hover growth (1.15, about 6 px a side on a full-width name) stays inside the cell.
- The shelf's list reset is `list-reset(0, false)`: the default also sets `> li::before { content: none }`, which out-ranks the cell's `::before` and would leave only the right-hand fillet. The cell sets its own `margin: 0`.
- The grid fills with `auto-fill` columns of 5.25rem, 4.6rem under 30rem, so a long shelf wraps at any width.

**Hover, focus and motion**

- On a jar with a button, the drawing shakes once and the name grows. An observer's shelf is still.
- **The shake** is a 500ms CSS animation on the drawing's `svg`: it turns 6 degrees one way, 4.5 the other, then 3, then 1.5, then rests. The `svg` pivots on its bottom centre (`transform-origin: 50% 100%`), the plank, so the jar rocks on its shelf. It plays once each time the pointer enters. It moves the `svg`, never the level inside it, because `jar-shelf__rise` has a `transform` transition of its own and the two would fight. It never moves the amount's Low or Out symbol.
- **The name** scales to 1.15 from its middle over `$motion-short` (150ms) and eases back. It is `inline-block`, since a transform has no effect on an inline box, and the scale moves nothing around it. A long name may reach a little past its cell while the pointer is there. The name is not underlined.
- **Who gets it.** The rule starts from `.jar-shelf__press:hover`, which the stretched `::after` makes the whole cell, and finds the shake from its cell with `:has()`. It sits in `@media (hover: hover)`, so a touch screen is never left with a jar stuck mid-shake. Keyboard focus does both too, as `:focus-visible` on the button so a mouse click does not repeat it; those rules, and the name's `inline-block` and transition, sit outside the hover query, since a keyboard on a touch device has no hover to wait for. Hovering a Low or Out amount, a button raised above the stretch, does not start it.
- **Reduced motion.** No shake, from hover or focus, and the name changes size with no transition. The level rises on a change (a save re-reads the page), but not under reduced motion.
- The rules are the `jar-press-motion` mixin in `src/scss/_jar-motion.scss`, which `JarLine` includes too, so a pressable jar moves the same everywhere. The angles, 500ms and 1.15 have no token (none holds an angle or a scale), so the keyframes are in `_jar-motion.scss` with a comment saying so; the grow and duration are in `_variables.scss`.

**Bands and waves in the spell's jar**

- `BANDS_FULL` bands fill the spell's jar; past that they shrink to keep fitting. `HALF` is half a wave period (four full periods across the 48-unit jar). `MAX_RISE` is the most a wave rises above its boundary (amplitudes 0.65 to 0.8) plus the 0.6 the top band's level line sits above its fill. That line is 1.2 wide and centred on its path, so the path is lifted by half of that.
- Boundary `k` (k = 0 is the flat, undrawn base) has a phase of `k` units and an amplitude alternating 0.8 and 0.65, so neighbouring edges run nearly parallel with a slight drift, with no randomness. The wave lies wholly above its baseline (0 to 2 × amplitude), so it adds to the layer above and does not cut into the top layer's height. Each half period is one quadratic curve with its control point on the far side of the middle line, joining the next on the same slope. It runs beyond the jar's edges (the clip trims it), so a band's closing sides are never seen.
- A band's top is boundary `top`'s wave and its bottom is boundary `top - 1`'s, the wave the band below draws as its own top, so bands tile with no gap. The lowest band is flat along the base.
- The ingredient bands are two tints of the one ink, alternating. Only the top band draws a line, the level line, with its upper edge drawn as a held jar's level line. A layer drawn in its category group's colours reads them from custom properties, as a chip does: 55% in the light theme and 65% in the dark, so the top line stays legible.

## Jar line

`src/components/JarLine/` is one line of a list that shows a jar beside a name and some words. The recipe page's In the Cupboard panel (`SpellBuilder/inventory.tsx`) and the Complete Working preview (`RecordWorking/completion.tsx`) both draw their lines through it, so the two behave the same. Props are in `types.ts`; these facts are not in it:

- `seed` and `kind` pick the vessel (`pickJarShape`); `held` and `tone` (`ok`, `low`, `out`, `empty`, the shelf's `jar-shelf__jar--*` modifiers) draw the level and paint. `oneOff` draws a muted jar at the middling level and gives the line no press.
- The inventory sends need, have and a verdict mark as `words`; the preview sends takes, have, left, short by, one-off or no jar. `look` is a control in a column of its own at the right. `press` is `StockJarButton`'s props, wrapped around the name.
- The button holds the name and is stretched over the jar by its `::after`, as on the shelf; pointing at it or focusing it shakes the jar once and grows the name. A line without a press stays still. The mixin is the one in `_jar-motion.scss`; its keyframes (`jar-shake-keyframes`) are included once, by the shelf's sheet, which loads wherever a jar is drawn. Reduced motion is as for the shelf.
- A caller styles its list through its own wrapper class: the inventory trims the eye and wraps names in a narrow column; the preview wraps long names and sets the words smaller.

## Jar lines

`src/components/JarLines/` draws the jar lines of an ingredient card: what the coven holds of an entry, one line per jar, in the card's `children` slot ([`ingredient-card.md`](ingredient-card.md)). It takes `jars`, plain data `{ id, form, icon, quantity, unit, threshold }` (`types.ts`).

- `form` is the variant's form as stored, written through `formLabel`, which the lint rule `sorrel/form-shown-through-form-label` holds. `icon` is the form group's icon, or `null` for the generic spoon.
- `quantity`: a number is on hand, `0` is out, `null` is held but not measured and reads "Unmeasured". `threshold` only feeds the badge.
- One `li` per jar in a `ul` that the card's `.specimen__stock > ul` primitive lays out: the form icon and name, a decorative dot with the comma a screen reader hears in its place (the rule is "dot, never a comma"), the quantity and unit, and [`StockBadge`](stock-badge.md) last, at the right-hand end, drawing Low Stock, Out of Stock or nothing.
- **Where the badge sits.** Its centre is on the same vertical line as the card's rightmost action icon (Edit, Annotate or the three dots). The jar lines and the actions row share a right edge, and the actions are the large icon button (`$icon-size-large`, 32px) while the badge is `$stock-badge-size` (24px). So `.specimen__stock > ul > li` in `_primitives.scss` insets its end by `calc((#{$icon-size-large} - #{$stock-badge-size}) / 2)`, with no pixel value written down. The inset lives in the shared primitive, so every card that draws jar lines above its actions follows it.
- The card stories (`IngredientCard/story-jars.tsx`, `IngredientCardList/story-fixtures.tsx`) draw their jar lines through this component, so no story keeps a copy of the markup.

## Used by

The entry page's Stock section (`stock-section.tsx`); the spell builder's jar details; the recipe page's inventory and the Complete Working preview (JarLine); the ingredient card (JarLines).

## Not here

The edit dialog ([`stock-dialog.md`](stock-dialog.md)) and the badge's words and icons ([`stock-badge.md`](stock-badge.md)).

Stories are in `src/components/JarShelf/index.stories.tsx` (`States`, `EveryShape`), `JarLine/index.stories.tsx` and `JarLines/index.stories.tsx`. Tests are in `tests/components/JarShelf/`, `JarLines/` and `IngredientEntry/` (a press on a jar opens the dialog with that form chosen), `tests/components/StockDialog/` (`openOn`, `StockJarButton`) and `tests/e2e/entry-stock.spec.ts` (a jar pressed by keyboard).
