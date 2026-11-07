# JarShelf

`src/components/JarShelf/` is a shelf of small drawn jars, one for each form of an ingredient, on the entry page's Stock section. It shows at a glance what the coven holds of each form. For a role that may edit stock, each jar is also a button that opens Edit Stock on that form ([`stock-dialog.md`](stock-dialog.md)). The drawing is the approved "Fillets" mock. It has no idle motion; the only movements are the level's rise when an amount changes and the hover on an editable jar. Both are off under `prefers-reduced-motion`, bar the name's change of size.

This doc also covers `JarLine` and `JarLines`, which draw jars in lists.

## Contracts

**Props** (`types.ts`)

- The shelf draws `forms` in the order given and sorts nothing: the entry's Stock section ([`ingredient-entry.md`](ingredient-entry.md), "Stock") puts forms with a jar first and those with none after. A jar holding 0 is a jar, so an Out jar keeps its place among the held ones.
- `seed` is the entry's formal name, or its id when it has none. It is the formal name and not the coven's own label, so relabelling an entry does not change its shelf.
- With `edit` (the `StockDialog` props) each jar is a button; without it the jars are plain figures.

**Which vessel a form gets**

- `pick(seed, form)` trims and lower-cases the pair, so a change of case does not re-roll the vessel. A form matching `LIQUID` picks from the four bottles; every other form from the seven jars.
- The same name and form always give the same vessel in every coven. Nothing is stored, so the pick is tested as a plain function.
- `JarDrawing` (the drawing alone) and `pickJarShape` are exported. The spell builder's jar details reuse both ([`spell-builder.md`](spell-builder.md), "The jar details"), seeding a linked step's vessel with the ingredient id, so it can differ from the one the ingredient's own page shelves.

**The level**

`fillOf` in `level.ts` turns a jar into `{ level, mark }`, each a fraction of the glass (0 empty, 1 full); `mark` is where the dashed low-stock line sits. A jar at its threshold stands half full; at twice its threshold or more, full. A jar with a threshold and quantity 0 is empty with its mark half way. An unmeasured jar, and a held one with no threshold, stands at 0.7 so "held but not measured" is not read as empty.

**The drawing**

- The wave is drawn one period past each side of the 48-wide box so it could slide and still cover the body; the shelf does not slide it.
- The level is clipped to the body's outline. The clip sits on an untransformed group around the group that moves, since a clip on a transformed element moves with it. The level is lifted by `translateY`, not by animating `y` and `height`, which Safari does not transition on SVG (`jar-shelf__rise`).
- Colours come from tokens alone. Ink is the text colour; the level and wave are the accent.
- A **Low** or **Out** jar is told by the jar itself, not a boxed badge, from `stockState` ([`stock-badge.md`](stock-badge.md)). The rules come after the base paint so they win by order as well as by the extra class.
  - Out draws a solid outline, never dashed, so it cannot read as the dashed outline of a form with no jar. The wave, mark, cork and cloth are left off, since an empty jar has no surface to ripple.
  - The amount under either is in the same colour, with the badge's drawing before it (`StockIcon`), so the state is told by a symbol as well as colour (WCAG 1.4.1) and a Low jar reads the same here as on the card. There is no extra word ([`grimoire.md`, "Design review of the workspace ingredients page"](../design-decisions/grimoire.md#design-review-of-the-workspace-ingredients-page)).
- A faceted jar's two bands (`__shade`, `__shine`) are `$jar-shade` and `$jar-shine`, a solid colour each, set per theme ([`styling.md`](../styling.md), "The faceted jar's bands"). In the dark theme the shade is the lighter of the two, so the bands read as facets and not as light and shade.

**Markup and accessibility**

- The SVG is `aria-hidden`; the form and amount beside it say all of it.
- **The amount button.** For a Low or Out jar the amount is a button that opens the badge's tip, in the badge's place (`StockTip`, so `IconTip`'s timing). It looks like text. Its words are the shared `stock-words.ts` ([`stock-badge.md`](stock-badge.md), "Shared words"). It is shown to an observer too.
  - Its accessible name is the amount and the state (**40 g, Low Stock**, **0 ml, Out of Stock**).
  - Low's description is written once in a `.visually-hidden` span since the tip's bubble is hidden from a screen reader. Out has none, as it would repeat the name.
- For a role that may edit, the form's name is a button named **Edit Stock, <entry name>, <Form>**, an empty jar's too, since pressing it adds the form. It is stretched over the whole jar by its `::after`, so the jar is one target, with its focus ring on that `::after` (inset, so the first and last column's ring is not cut). The amount sits beside the button, not inside it, because a Low or Out amount is a button of its own and one button cannot hold another; it is raised so it can still be pressed.
- For an observer the jars are plain text: no button, no hover effect.
- The button is `StockJarButton` ([`stock-dialog.md`](stock-dialog.md)) with `openOn` set to the form's variant id. For an empty jar the dialog adds the form as a new row first, so it is dirty from the start (Save is on, Cancel asks before throwing the row away). The empty jar's button is named "Edit Stock" like the others, not "Add Stock".

**Shelf geometry and styling**

- The `_variables.scss` jar variables are shared with the entry's loading skeleton, so the stand-in jars are the real ones' size.
- The plank is a background on the cell and the fillets are radial gradients on its `::before` and `::after`, so each jar is one element. They replace `typography-base`'s diamond bullet; its shape is cleared first in the same rule.
- Each cell draws the halves of its two brackets just outside its own edges, so between two jars the halves meet in a full bracket.
- **The outer ends carry no fillet.** The shelf has `overflow-x: clip` and its columns have no gap and fill the width, so the first and last column of every row sit on its edge and the half drawn outside is cut off, on each visual row, with no script or row counting. The last cell has its `::after` left off, because when it ends a short row it is not on the clipped edge.
- The clip is sideways only and `overflow: clip` makes no scroll box. Where it is not understood the outer halves simply show. The Low and Out tips are `position: fixed`, so they escape the clip. The cell's side padding keeps the name's hover growth inside the cell.
- The shelf's list reset is `list-reset(0, false)`: the default also sets `> li::before { content: none }`, which out-ranks the cell's `::before` and would leave only the right-hand fillet.

**Hover, focus and motion**

- On a jar with a button, the drawing shakes once and the name grows. An observer's shelf is still.
- **The shake** pivots on the plank (`transform-origin: 50% 100%`), so the jar rocks on its shelf. It plays once each time the pointer enters. It moves the `svg`, never the level inside it, because `jar-shelf__rise` has a `transform` transition of its own and the two would fight. It never moves the amount's Low or Out symbol.
- **The name** is `inline-block`, since a transform has no effect on an inline box, and the scale moves nothing around it. A long name may reach a little past its cell while the pointer is there.
- **Who gets it.** The rule starts from `.jar-shelf__press:hover`, which the stretched `::after` makes the whole cell, and finds the shake from its cell with `:has()`. It sits in `@media (hover: hover)`, so a touch screen is never left with a jar stuck mid-shake. Keyboard focus does both too, as `:focus-visible` on the button so a mouse click does not repeat it; those rules sit outside the hover query, since a keyboard on a touch device has no hover to wait for. Hovering a Low or Out amount, a button raised above the stretch, does not start it.
- **Reduced motion.** No shake, from hover or focus, and the name changes size with no transition. The level rises on a change (a save re-reads the page), but not under reduced motion.
- The rules are the `jar-press-motion` mixin in `src/scss/_jar-motion.scss`, which `JarLine` includes too, so a pressable jar moves the same everywhere. The angles have no token (none holds an angle), so the keyframes are in `_jar-motion.scss` with a comment saying so.

**Bands and waves in the spell's jar**

- `BANDS_FULL` bands fill the spell's jar; past that they shrink to keep fitting. `MAX_RISE` is the most a wave rises above its boundary plus the 0.6 the top band's level line sits above its fill. That line is 1.2 wide and centred on its path, so the path is lifted by half of that.
- Boundary `k` (k = 0 is the flat, undrawn base) has a phase of `k` units and an amplitude alternating 0.8 and 0.65, so neighbouring edges run nearly parallel with a slight drift, with no randomness. The wave lies wholly above its baseline, so it adds to the layer above and does not cut into the top layer's height. It runs beyond the jar's edges (the clip trims it), so a band's closing sides are never seen.
- A band's top is boundary `top`'s wave and its bottom is boundary `top - 1`'s, the wave the band below draws as its own top, so bands tile with no gap.
- The ingredient bands are two tints of the one ink, alternating. Only the top band draws a line, the level line. A layer drawn in its category group's colours reads them from custom properties, as a chip does: 55% in the light theme and 65% in the dark, so the top line stays legible.

## Jar line

`src/components/JarLine/` is one line of a list that shows a jar beside a name and some words. The recipe page's In the Cupboard panel and the Complete Working preview both draw their lines through it, so the two behave the same. Props are in `types.ts`; these facts are not in it:

- `oneOff` draws a muted jar at the middling level and gives the line no press.
- `press` is `StockJarButton`'s props, wrapped around the name. The button is stretched over the jar by its `::after`, as on the shelf; a line without a press stays still. The motion mixin is the one in `_jar-motion.scss`; its keyframes (`jar-shake-keyframes`) are included once, by the shelf's sheet, which loads wherever a jar is drawn. Reduced motion is as for the shelf.

## Jar lines

`src/components/JarLines/` draws the jar lines of an ingredient card, one per jar, in the card's `children` slot ([`ingredient-card.md`](ingredient-card.md)).

- `form` is written through `formLabel`, which the lint rule `sorrel/form-shown-through-form-label` holds. `icon` is the form group's icon, or `null` for the generic spoon.
- `quantity`: a number is on hand, `0` is out, `null` is held but not measured and reads "Unmeasured". `threshold` only feeds the badge.
- The dot is decorative, with the comma a screen reader hears in its place (the rule is "dot, never a comma"). [`StockBadge`](stock-badge.md) is last, at the right-hand end.
- **Where the badge sits.** Its centre is on the same vertical line as the card's rightmost action icon (Edit, Annotate or the three dots). The jar lines and the actions row share a right edge, and the action icon is larger than the badge, so `.specimen__stock > ul > li` in `_primitives.scss` insets its end by half the difference, with no pixel value written down. The inset lives in the shared primitive, so every card that draws jar lines above its actions follows it.
- The card stories (`IngredientCard/story-jars.tsx`, `IngredientCardList/story-fixtures.tsx`) draw their jar lines through this component, so no story keeps a copy of the markup.

## Used by

The entry page's Stock section (`stock-section.tsx`); the spell builder's jar details; the recipe page's inventory and the Complete Working preview (JarLine); the ingredient card (JarLines).

## Not here

The edit dialog ([`stock-dialog.md`](stock-dialog.md)) and the badge's words and icons ([`stock-badge.md`](stock-badge.md)).

Stories are in `src/components/JarShelf/index.stories.tsx`, `JarLine/index.stories.tsx` and `JarLines/index.stories.tsx`. Tests are in `tests/components/JarShelf/`, `JarLines/` and `IngredientEntry/` (a press on a jar opens the dialog with that form chosen), `tests/components/StockDialog/` (`openOn`, `StockJarButton`) and `tests/e2e/entry-stock.spec.ts` (a jar pressed by keyboard).
