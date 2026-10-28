# JarShelf

`src/components/JarShelf/` — a shelf of small drawn jars, one for each form of an ingredient, on the entry page's Stock section (M12.29). It shows at a glance what the coven holds of each form. For a role that may edit stock, each jar is also a button that opens Edit Stock on that form ([`stock-dialog.md`](stock-dialog.md)).

The drawing is the owner's approved mock (the "Fillets" shelf: a thin plank with a curved bracket at each end). It has no idle motion: no slosh or drift. Its movements are the level's rise when an amount changes and the hover on a jar the coven can edit (see Styling). Both are off under `prefers-reduced-motion`, bar the name's change of size.

## Props

`forms`, `seed` and, optionally, `edit` (`types.ts`).

- `forms` is one `{ variantId, form, jar }` for each form of the entry, in the order to show them. `form` is the variant's form as stored; the shelf writes it through `formLabel`. `jar` is the jar the coven holds of that form, `{ id, quantity, unit, threshold }`, or `null` for none. A form with no jar still has a place on the shelf. The shelf draws `forms` in the order it is given and sorts nothing itself: the entry's Stock section ([`ingredient-entry.md`](ingredient-entry.md), "Stock") puts the forms with a jar first and those with none after, each group in the forms' order (the owner, 2026-10-21). A jar holding 0 is a jar, so an Out jar keeps its place among the held ones.
- `seed` is what the vessels are drawn from: the entry's formal name (`canonicalName`), or the entry's id when it has none.
- `edit` is the `StockDialog` props. Pass it for a role that may edit and each jar becomes a button; leave it out and the jars are plain figures.

`stock-section.tsx` builds these from the entry's variants and the coven's jars.

## Which vessel a form gets

`pick(seed, form)` in `pick.ts`. It joins the seed and the form, trims and lower-cases them, hashes the text with djb2 (a small string hash), and takes the result modulo the number of vessels in a pool. A form matching `LIQUID` (oil, tincture, essence, water, vinegar, syrup, extract, juice, elixir, infusion, hydrosol) picks from the four bottles; every other form from the seven jars. The same name and form always give the same vessel, in every coven, and nothing is stored, so the pick can be tested as a plain function. The formal name is the seed, not the coven's own name for the entry, so relabelling an entry does not change its shelf.

## The level

`fillOf` in `level.ts` turns a jar into `{ level, mark }`, each a fraction of the glass: 0 is empty, 1 is full, and `mark` is where the dashed low-stock line sits (solid in a Low jar).

TODO(owner): this rule is the builder's. The mock gave example heights only.

| Jar                                 | Level                                     | Mark                                       |
| ----------------------------------- | ----------------------------------------- | ------------------------------------------ |
| Threshold above 0, quantity above 0 | `quantity / max(2 × threshold, quantity)` | `threshold / max(2 × threshold, quantity)` |
| Threshold above 0, quantity 0       | 0 (empty)                                 | `threshold / (2 × threshold)`, so half way |
| No threshold, quantity above 0      | 0.7                                       | none                                       |
| No threshold, quantity 0            | 0 (empty)                                 | none                                       |
| Unmeasured (`null`)                 | 0.7                                       | none                                       |

So a jar at its threshold stands half full, and one at twice its threshold or more stands full. An unmeasured jar stands at 0.7 so that "held but not measured" is not read as empty. `lv(shape, level)` in `shapes.ts` maps the fraction onto the shape's own glass: `40 − (40 − full) × level`, in the drawing's 48 by 40 units.

## The drawing

`shapes.ts` holds eleven shapes as data: `hex`, `mason`, `apoth`, `cork`, `clip`, `honey`, `cloth` (the jars), and `bottle`, `flask`, `erlen`, `vial` (the bottles). Each has its full height, its body outline, its lid parts, optional extras, and a wave period and amplitude.

- The level is a rectangle clipped to the body's outline. The clip sits on an untransformed group around the group that moves, since a clip on a transformed element moves with it. The group is lifted by a `translateY` rather than by animating `y` and `height`, which Safari does not transition on SVG.
- Each drawing's clip has an id of its own, from `useId`, as two on a page cannot share one.
- Colours are classes (`jar-shelf__glass`, `__lid`, `__level`, and so on) in `index.scss`, from the tokens alone.
- An empty jar (`jar-shelf__jar--empty`) draws dashed muted strokes and hides its cork and cloth.
- A Low or Out jar is told by the jar itself (the owner's call, 2026-10-21, mock "4B"), not by a boxed badge. The cell wears `jar-shelf__jar--low` or `--out`, from `stockState` ([`stock-badge.md`](stock-badge.md)). **Low** draws the glass, the level (at 30% opacity) and the wave in `$stock-low-ink`, the warning amber the badge's Low is drawn in, and the threshold mark solid, not dashed, at stroke 1.4. **Out** draws the glass, lid and facets as a solid red outline in `$stock-out-ink`, the Out of Stock badge's ink, never dashed, so it cannot be read as the dashed outline of a form with no jar. The glass has a faint tint of the same red (14% over transparent). The wave, mark, cork and cloth are left off, since the jar is empty and has no surface to ripple. The amount under either is in the same colour at weight 500, with the badge's own drawing before it: Low's double chevron or Out's slashed ring, `StockIcon` from [`stock-badge.md`](stock-badge.md), 1em square (`.jar-shelf__amount-icon`). Without it the two states were told chiefly by colour, since Low's mark is a hairline and an Out jar is empty either way; the symbol is the one the card's badge shows, so a Low jar reads the same on both (MB.121, proposal P1, against the owner's earlier "no extra word and no icon" of 2026-10-21; [`mb.121-workspace-ingredients-review.md`](../design-decisions/mb.121-workspace-ingredients-review.md)). There is no extra word.

TODO(owner): a faceted jar's two bands (`__shade`, `__shine`) are made from the text and card colours with `color-mix`, as no token of their own exists. In the dark theme the text colour is the light one, so the two bands swap roles there. Say whether they should be tokens, one pair for each theme.

The module also exports `JarDrawing` (the drawing alone, level and tint) and `pickJarShape` (the vessel for a seed and a form). The spell builder's Jar aside reuses both ([`spell-builder.md`](spell-builder.md), "The Jar aside"). It seeds the vessel for a linked step with the ingredient id, so a vessel there can differ from the one the ingredient's own page shelves.

## Markup and accessibility

- The shelf is a `ul` named **Jars**; each jar is an `li`.
- The SVG is `aria-hidden`: the form and amount beside it say all of it.
- Under the drawing: the form, then the amount ("250 g", a bare number, or **Unmeasured**), or **No Jar** for a form with none. A jar that is Low or Out has its amount as a button (below); every other amount is plain text.
- **The amount button.** For a Low or Out jar the amount is the button that opens the badge's tip, in the badge's place. It looks like text: no box, no tint, the help cursor and the app's normal focus ring. It is the badge's `StockTip`, and so `IconTip`'s: the tip opens after the pointer rests, at once on focus, and Escape closes it. The words are the badge's, from the shared `stock-words.ts` ([`stock-badge.md`](stock-badge.md), "Shared words"). Its accessible name is the amount and the state, **40 g, Low Stock** or **0 ml, Out of Stock** (the amount as written, so **3, Low Stock** with no unit). Low's description is **Low Stock at 50 g or less**, written once out of sight in a `.visually-hidden` span, since the tip's bubble is hidden from a screen reader; Out has no description, as its tip would only repeat the name. It is shown to a viewer too, who has no Edit Stock press.
- For a role that may edit, the form's name is a button named **Edit Stock, <entry name>, <Form>**, an empty jar's too, since pressing it adds the form. The button stretches over the whole jar by its `::after`, so the jar is one target, with its focus ring on that `::after`. The amount sits beside the button and not inside it: a Low or Out amount is a button of its own, and one button cannot hold another. It is raised above the stretch (`z-index: 1`) so it can still be pressed.
- For a viewer the jars are plain text: no button, no hover effect.

## Opening Edit Stock

A jar's button is `StockJarButton` ([`stock-dialog.md`](stock-dialog.md)) with `openOn` set to the form's variant id, so the dialog opens with that form chosen. For an empty jar the dialog adds the form as a new row first, so the dialog is dirty from the start (Save is on, and Cancel asks before throwing the row away). The empty jar's button is named "Edit Stock" like the others, not "Add Stock".

## Styling

Variables in `_variables.scss` (`$jar-top`, `$jar-drawing-width`, `$jar-drawing-height`, `$jar-plank`, `$jar-cell-min`, `$jar-cell-min-narrow`) are shared with the entry’s loading skeleton, and size the cell’s top padding, the drawing (35.52 by 29.97 px, which is 32 by 27 made 11% bigger on 2026-10-21) and the plank (1.5 px, with 7 px brackets). The plank is a `linear-gradient` background on the cell and the fillets are radial gradients on its `::before` and `::after`, so each jar is one element. Every cell draws the halves of its two brackets just outside its own edges (`::before` at `left: -7px`, `::after` at `right: -7px`), so between two jars the right half from one cell and the left half from the next meet in a full bracket. **The outer ends carry no fillet** (the owner, 2026-10-21): the shelf has `overflow-x: clip`, and its columns have no gap and fill the width, so the first and last column of every row sit on its edge and the half drawn outside it is cut off. This works on each visual row, wrapped or not, with no script and no counting of rows. The shelf's last cell has its `::after` left off (`:last-child`), since when it ends a short row it is not on the clipped edge. The clip is sideways only and `overflow: clip` makes no scroll box. Three things are arranged around it: the cell's side padding is `space(2)`, so the name's hover growth (1.15) stays inside the cell; the stretched press's focus ring is inset, so the first and last column's ring is not cut; and the Low and Out tips are `position: fixed`, so they escape the clip. A short last row therefore has a plank ending flat at its last jar, as the full rows do. The shelf's list reset is `list-reset(0, false)`: the default also sets `> li::before { content: none }`, which out-ranks the cell's `::before` and had left only the right-hand fillet (the owner saw "half a fillet", 2026-10-21). The grid fills with `auto-fill` columns of 5.25rem, 4.6rem under 30rem, so a long shelf wraps at any width.

### Hover

The owner's call (2026-10-21): when the pointer is over a jar the coven can edit, the drawing shakes once and the name grows a little. The name is no longer underlined.

- **The shake** is a CSS animation of 500ms on the drawing's `svg`: it turns 6 degrees one way, 4.5 the other, then 3, then 1.5, then rests (the first version was 4, 3, 2 and 1; the owner asked for a little more on 2026-10-21), each swing smaller than the last. The `svg` pivots on its bottom centre (`transform-origin: 50% 100%`), the plank the jar stands on, so the jar rocks on its shelf. It plays once each time the pointer enters and does not loop. It moves the `svg` and not the level inside it, because the level's group (`jar-shelf__rise`) has a `transform` transition of its own and the two would fight.
- **The name** scales to 1.15 from its middle over `$motion-short` (150ms), and eases back when the pointer leaves. The name is `inline-block` so the scale takes effect, and a transform does not move its neighbours. A long name may reach a little past its cell for as long as the pointer is there.
- **Who gets it.** Only a jar with a button: the rule starts from `.jar-shelf__press:hover`, which the button's stretched `::after` makes the whole cell, and the shake is found from its cell with `:has()`. A viewer's plain jars do not move. The effect sits in `@media (hover: hover)`, so a touch screen never gets one stuck half way. Keyboard focus shakes the drawing too (the owner, 2026-10-21), by the same animation from `:focus-visible` on the button, so a mouse click does not shake it twice; that rule sits outside the hover query. The name grows on focus too (the owner, 2026-10-21), by the same scale and transition, from the same `:focus-visible` button; the name's `inline-block` and transition also sit outside the query for that reason. Hovering a Low or Out amount, which is raised above the stretch as a button of its own, does not start the effect.
- **Reduced motion.** No shake, from hover or from focus, and the name changes size with no transition.
- The angles, the 500ms and the 1.15 have no token (no token holds an angle or a scale), so they are private variables and a keyframe list in `index.scss`, each with a comment saying so.

## Tests

- `tests/components/JarShelf/`: the pick (same result for the same name and form whatever the case, a bottle for a liquid and a jar otherwise, the name and form both moving it), `fillOf` for every row of the table above, and the shelf: one jar per form in order, each amount, Unmeasured and No Jar, the amount buttons of a Low and an Out jar (their names and descriptions, and none on any other jar, a viewer's included), `aria-hidden` drawings with unique clips, plain figures with no `edit`, and a button for every jar, an empty one too, with the amount button outside it.
- `tests/components/IngredientEntry/`: a press on a jar opens the dialog with that form chosen, a press on an empty jar adds the form, and a viewer gets no jar buttons.
- `tests/components/StockDialog/`: `openOn` and `StockJarButton`.
- `tests/e2e/entry-stock.spec.ts` presses a jar by keyboard.
- Storybook (`Ingredients / Jar Shelf`): a viewer's shelf of six forms (full, low, out, unmeasured, no threshold and empty), the editable shelf, and a single form.
