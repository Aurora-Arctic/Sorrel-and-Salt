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
| `buttonType` | Optional: the items take the button's type and height, with one step less at the sides; off by default |
| `icon`       | Optional: an icon drawn in place of the words and the chevron; `label` stays the button's name, hidden |

A `MenuButtonItem` has a `key`, a title-case `label` and an optional `destructive`, `primary` or `constructive`. It is either a link, with `href` and an optional `onClick` that runs first and may prevent the navigation, or an action, with `onSelect`.

## Contracts

- **The keys.** Opening, by a press or ArrowDown on the button, puts the focus on the first choice. ArrowDown and ArrowUp move through the choices and wrap at the ends; Home and End go to the first and the last. Escape closes the menu and gives the focus back to the button. Tab and a press outside close it.
- **Choosing closes first.** A choice closes the menu and then runs its action, or follows its link. A choice that opens a dialog gives the focus back to the button through `ref` once the dialog closes, since the menu item has gone.
- **It fades in and out** over the short motion, `$motion-short` (the owner's call, 2026-10-19). A closing menu stays drawn until its fade-out ends, inert and hidden from assistive technology, so nothing finds or focuses it on its way out. A browser that never reports the end still hides it after 400ms, and under reduced motion it goes at once. Once closed, the menu stays in the page with the `hidden` attribute rather than being removed, so a dialog that one of its links opened can find that link when it closes and hand the focus to the menu's button (`RouteModal`, [modal.md](modal.md#giving-the-focus-back); M8.17).
- **An icon alone.** With `icon`, the button shows the icon and no chevron, and keeps `label` as its accessible name in hidden text, so a list card's More (the vertical dots, [`coven-cards.md`](coven-cards.md)) sits in a row of other icons (M8.17).
- **Busy is shut.** While `busy`, the button is disabled, carries `aria-busy`, and shows the spinner and `busyLabel` in place of the label and chevron.
- **Where it opens: the room decides.** The menu is placed by the Combobox's own placement hook, `useListPosition` in `src/components/Combobox/position.ts`, on Floating UI, the same rules as a list's ([`combobox.md`](combobox.md), "Where the list opens"; MB.154, M8.17). It hangs from the button's end edge, 8px (`space(2)`) under it (`bottom-end`), and flips over it (`top-end`) when there is more room above, as at the foot of a dialog or of the window. It is shifted to stay 8px inside the screen and clear of the phone's fixed bottom bar, is fixed rather than absolute so a scrolling dialog cannot clip it, and follows a scroll or a resize while open. It keeps its own width, as wide as its items, and the caller names no side: an `opens` prop that did is gone. It fades the same either way.
- **It fills a stretched box.** The button grows to fill the box a layout gives it, as a narrow form's stacked foot makes every button full width (M8.17); otherwise the box is the button's own width.
- **Look.** The menu is the bar's Add Ingredient menu: a card hung under or over the button's end edge, small text, and on hover, focus and the chosen flash as the menu fades, the grey quiet fill, `$fill-quiet`. Green marks a menu's one primary action alone (the owner's call, 2026-10-20): a `primary` choice takes the highlight, `$fill-highlight` (the accent 12% into the card), as Edit Ingredient does on the ingredient page, and a constructive choice, Add to Cupboard on the entry page, is in the accent green and takes the same highlight, its text in the accent's hover shade, which holds 4.5:1 on the tint where the plain accent does not. Link to the Compendium, Annotate and Make It Ours are never green. A destructive choice is in the destructive colour, and filled with it on hover and focus as `.btn--destructive` is (the owner's call, 2026-10-19). Every ink on its fill holds 4.5:1 in both themes (`tests/scss/tokens.test.ts`).
- **In the button's type.** With `buttonType` the items take the button's own face, size and weight, as `.btn` sets them, and its top and bottom padding and height (`space(2)`, `$control-height`), with the sides one step less than the button's, `space(4)` for its `space(5)` ("not so much left and right"), rather than the lighter, shorter item every other menu keeps. Only the Annotate dialog's More sets it, since its two items are the actions of the dialog's foot (the owner's call, 2026-10-20). A destructive choice stays destructive.

## Where it is tested

`tests/components/MenuButton/index.test.tsx`: the keys, the closing, a link choice and the busy state. The entry page's choices are in `tests/components/IngredientEntry/cupboard-actions.test.tsx`, and the browser walks in `tests/e2e/cupboard-screens.spec.ts` and `tests/e2e/make-it-ours.spec.ts`; the Annotate dialog's More, staying inside the dialog, its items in its type, and full width at 375px, and a card's More near the window's foot opening above it inside the window at a desktop's width and at 375px, in `tests/e2e/coven-ingredients.spec.ts`. Story: `src/components/MenuButton/index.stories.tsx`.
