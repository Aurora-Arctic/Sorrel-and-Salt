# AddIcon

`src/components/AddIcon/` is the plus: **Add to My Ingredients** as an icon button. It stands at a compendium card's bottom right ([`compendium-cards.md`](compendium-cards.md), "The plus"), left of the pencil on the entry pages, and beside the pencil in the Quick Look window ([`ingredient-entry.md`](ingredient-entry.md), "The plus"). It is a client component of its own because a press needs the browser and the cards stay a server component. `NamedAddIconProps` (`types.ts`) is `AddIconProps` plus the entry's name, kept apart because a page reads the covens (`CupboardPlus`) and the name from different places.

## Contracts

- **One coven adds at once; two or more are a menu.** With one writable coven, a press sends `addCupboardEntry` there with no quantity and reads the page again. With two or more, the plus is always a [`MenuButton`](menu-button.md) of every one by name, even when only one lacks the entry. A coven that holds the entry is a disabled item with a green check, named **<coven>, in its cupboard**.
- **It adds the entry and nothing else**, and writes no stock. A form and a quantity are given afterwards in Edit Stock, which the card's three dots offer first once the coven holds the entry ([`compendium-cards.md`](compendium-cards.md), "The menu"; [`stock-dialog.md`](stock-dialog.md)).
- **Its name and its tip are the words and then the entry:** **Add to My Ingredients: Testwort, Formalis testis**. The words on screen are part of the accessible name (WCAG 2.5.3), and a list of buttons tells one card's plus from the next. The colon is there because a formal name holds a comma of its own. The menu takes the same name ([`compendium-cards.md`](compendium-cards.md), "Names").
- **Busy keeps the focus.** From the press until the page has been read again, the plus shows the shared spinner and carries `aria-busy` and `aria-disabled`, never `disabled`, so the focus stays on it. A press while busy does nothing.
- **The words are held once**, in `wording.ts` (`ADD`, `HELD_ALL_TIP`, `HELD_TIP`, `HELD_MARK`, `HELD_IN_COVENS_TITLE`), imported by the plus, both `HeldMark`s and the entry page's summary. The e2e specs keep their own copy in `tests/support/cupboard-wording.ts`, so a changed word fails them.
- **After an add**, the spinner turns into the check, which holds for `ADDED_HOLD_MS` (1s) and until the page has been read again, then cross-fades back to the plus. `AddIcon` sets the button's `data-state` (`added`, then `returning`). `useFade` keeps the check drawn while it fades and drops the fade under reduced motion. The success is said once, "Added to <coven>.", through the page's status region.
- **When the add left every coven holding the entry, the check stays** until the page draws `HeldMark` in its place, so nothing jumps. While the check shows, the plus wears the held mark's look (no wash, default cursor).
- **A refusal** is said in a callout under the plus ([`click-feedback.md`](click-feedback.md)), and the focus goes back to the plus, since the chosen menu item went with the menu.
- **The held check**, `HeldMark` in `CompendiumCards/held-mark.tsx`, takes the plus's place once every writable coven holds the entry, named **In Every Cupboard: Testwort, Formalis testis**. Its look lives here, in `.add-icon--held`, since it stands where the plus stood; it is worn alone, without `.add-icon`, so the plus's wash on focus never reaches it.

## Styling

- The plus is the `icon-button` mixin at `$icon-size-large`, in Edit's green (`icon-button-edit`), since adding is constructive. On a phone it is a 2rem target, above WCAG 2.5.8's 24px.
- `.add-icon__eye` is the Quick Look eye arriving in the plus's place. The ingredient form's duplicate warning stacks it under the check, whose + turns into the eye after an add rather than back into a plus ([`ingredient-form.md`](ingredient-form.md), "The + in the duplicate warning").
- **Forced colours.** The plus has no border, so its hover and open states come from the `icon-button` and `icon-button-edit` mixins: a 1px inset `Highlight` outline under the pointer (not while it has the focus ring), and a `Highlight` fill with `HighlightText` ink while its menu is open. The held check and the plus while it shows the check undo those two, having neither state.

## Not here

Stories: `index.stories.tsx` (`Surfaces / Add Icon`). Pending, Added and Returning are the plus's markup in those states, since only a press reaches them and the workshop serves no `/api/graphql`. Tests: `tests/components/AddIcon/`, `tests/components/CompendiumCards/add-icon.test.tsx` and `tests/e2e/compendium-add.spec.ts`.
