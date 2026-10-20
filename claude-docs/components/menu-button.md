# MenuButton

`src/components/MenuButton/` is a button with a label and a chevron that opens a menu of choices. None of the choices is the button's own: pressing it only opens the menu. The ingredient entry page uses it as its **Edit** menu, so the title keeps its line however many cupboard choices a member has ([`ingredient-entry.md`](ingredient-entry.md), "Cupboard buttons"; the owner's call, 2026-10-19).

It follows the menu-button pattern of the ARIA Authoring Practices Guide, as the bar's Add Ingredient chevron does ([`app-shell.md`](app-shell.md)). That chevron keeps its own copy of the keys because it has no label and joins a split button.

## Props

`MenuButtonProps` (`types.ts`):

| Prop         | What it is                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| `label`      | The button's text and accessible name, and the menu's accessible name, in title case: "Edit"           |
| `className`  | The button's classes: `btn btn--quiet btn--medium`                                                     |
| `items`      | The choices, in order (`MenuButtonItem`)                                                               |
| `busy`       | Optional: one of the choices is in flight. The button shows the spinner and is disabled                |
| `busyLabel`  | Optional: the label while busy, "Adding"                                                               |
| `ref`        | Optional: the button, so a caller can give the focus back to it after a dialog a choice opened         |
| `opens`      | Optional: `below`, the default, or `above`, for a button at the foot of a dialog                       |
| `buttonType` | Optional: the items take the button's type and height, with one step less at the sides; off by default |

A `MenuButtonItem` has a `key`, a title-case `label` and an optional `destructive` or `constructive`. It is either a link, with `href` and an optional `onClick` that runs first and may prevent the navigation, or an action, with `onSelect`.

## Contracts

- **The keys.** Opening, by a press or ArrowDown on the button, puts the focus on the first choice. ArrowDown and ArrowUp move through the choices and wrap at the ends; Home and End go to the first and the last. Escape closes the menu and gives the focus back to the button. Tab and a press outside close it.
- **Choosing closes first.** A choice closes the menu and then runs its action, or follows its link. A choice that opens a dialog gives the focus back to the button through `ref` once the dialog closes, since the menu item has gone.
- **It fades in and out** over the short motion, `$motion-short` (the owner's call, 2026-10-19). A constructive choice, Add to Cupboard, is in the accent green and filled the same way. A closing menu stays drawn until its fade-out ends, inert and hidden from assistive technology, so nothing finds or focuses it on its way out. A browser that never reports the end still unmounts it after 400ms, and under reduced motion it goes at once.
- **Busy is shut.** While `busy`, the button is disabled, carries `aria-busy`, and shows the spinner and `busyLabel` in place of the label and chevron.
- **Above, at a dialog's foot.** With `opens="above"` the menu hangs over the button instead of under it, so a menu at the foot of a dialog stays inside the dialog rather than running past its edge (M8.17, the Annotate dialog's More). It keeps to the button's end edge either way, which keeps it inside a narrow dialog too, and fades the same.
- **It fills a stretched box.** The button grows to fill the box a layout gives it, as a narrow form's stacked foot makes every button full width (M8.17); otherwise the box is the button's own width.
- **Look.** The menu is the bar's Add Ingredient menu: a card hung under (or over) the button's end edge, small text, and the highlight, `$fill-highlight` (the accent 12% into the card), on hover and focus (M8.17, the owner's call of 2026-10-20; it was the quiet fill). The body ink holds 4.5:1 on it in both themes (`tests/scss/tokens.test.ts`). A destructive choice is in the destructive colour, and filled with it on hover and focus as `.btn--destructive` is (the owner's call, 2026-10-19).
- **In the button's type.** With `buttonType` the items take the button's own face, size and weight, as `.btn` sets them, and its top and bottom padding and height (`space(2)`, `$control-height`), with the sides one step less than the button's, `space(4)` for its `space(5)` ("not so much left and right"), rather than the lighter, shorter item every other menu keeps. Only the Annotate dialog's More sets it, since its two items are the actions of the dialog's foot (the owner's call, 2026-10-20). A destructive choice stays destructive.

## Where it is tested

`tests/components/MenuButton/index.test.tsx`: the keys, the closing, a link choice and the busy state. The entry page's choices are in `tests/components/IngredientEntry/cupboard-actions.test.tsx`, and the browser walks in `tests/e2e/cupboard-screens.spec.ts` and `tests/e2e/make-it-ours.spec.ts`; the Annotate dialog's More, opening above, its items in its type, and full width at 375px, in `tests/e2e/coven-ingredients.spec.ts`. Story: `src/components/MenuButton/index.stories.tsx`.
