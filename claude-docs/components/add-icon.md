# AddIcon

`src/components/AddIcon/` is the plus: **Add to My Ingredients** as an icon button. It stands at a compendium card's bottom right ([`compendium-cards.md`](compendium-cards.md), "The plus"), just left of the pencil on the entry pages, and beside the pencil in the Quick Look window ([`ingredient-entry.md`](ingredient-entry.md), "The plus"). It is a client component of its own, so the cards stay a server component.

## Props

`NamedAddIconProps` (`types.ts`), which is `AddIconProps` with the entry's name:

| Prop           | What it is                                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`         | The entry as the card names it (`cardName`): "Testwort, Formalis testis". The accessible name carries it                                            |
| `workspaceId`  | The default coven, added to at once where `covens` is empty                                                                                         |
| `ingredientId` | The compendium entry's id                                                                                                                           |
| `covens`       | Every coven the viewer may write in                                                                                                                 |
| `heldIn`       | The ids of those that already hold the entry                                                                                                        |
| `holding`      | The names of every coven of the viewer's that holds the entry, any role: counted on the plus and named in its tip. Left out or empty, neither shows |

`AddIconProps` stays apart because a page reads the covens (`CupboardPlus`) and the name from different places.

## Contracts

- **One coven adds at once; two or more are a menu.** With one writable coven, a press sends `addCupboardEntry` there and reads the page again. With two or more, the plus is a [`MenuButton`](menu-button.md) of every one of them by name, and a coven that holds the entry is a disabled item named **<coven>, in its cupboard**.
- **It adds the entry and nothing else.** The plus puts the entry in the coven's cupboard and writes no stock; a form and a quantity are given afterwards in Edit Stock, which the card's three dots offer first once the coven holds the entry ([`compendium-cards.md`](compendium-cards.md), "The menu"), as well as the coven card's own button ([`stock-dialog.md`](stock-dialog.md); the owner's call, 2026-10-21, which retired the dialog M9.12's second PR was to put behind it).
- **Its name and its tip are the words and then the entry:** **Add to My Ingredients: Testwort, Formalis testis** (MB.120; the owner's call, 2026-10-20, that the tip says the entry too), so the words on screen are the name (WCAG 2.5.3). The colon is there because a formal name holds a comma of its own. The menu takes the same name. The reasoning is in [`compendium-cards.md`](compendium-cards.md), "Names".
- **Busy keeps the focus.** From the press until the page has been read again, the plus shows the shared spinner and carries `aria-busy` and `aria-disabled`, never `disabled`, so the focus stays on it (MB.120). A press while busy does nothing.
- **The words are held once**, in `src/components/AddIcon/wording.ts` (`ADD`, `HELD_ALL_TIP`, `HELD_TIP`, `HELD_MARK`, `HELD_IN_COVENS_TITLE`), imported by the plus, both `HeldMark`s and the entry page's summary. The e2e specs keep their own copy in `tests/support/cupboard-wording.ts`, so a changed word fails them.
- **The plus and the menu share one wrapper:** `control` is the `MenuButton` or the button, and the component returns it inside one `IconTip` beside the feedback.
- **After an add**, the spinner turns into the check, which holds for `ADDED_HOLD_MS` (1s) and then fades back to the plus; where the add left every coven holding the entry, the check stays until the page draws `HeldMark` in its place. The button's `data-state` is `added`, then `returning` during the fade. The success is said once, "Added to <coven>.", through the page's status region.
- **A refusal** is said in a callout under the plus ([`click-feedback.md`](click-feedback.md)), whose badge is named Show the error for <the plus's name>, and the focus goes back to the plus.
- **The held check**, `HeldMark` in `src/components/CompendiumCards/held-mark.tsx`, takes the plus's place once every writable coven holds the entry. It is tipped and named **In Every Cupboard** and then the entry: **In Every Cupboard: Testwort, Formalis testis**. Its look lives here, in `.add-icon--held`, since it stands where the plus stood.

## Styling

`index.scss`, on the `add-icon` block (moved out of IconTip's stylesheet, MB.120, since IconTip only wraps the plus):

- **`.add-icon`**: the `icon-button` mixin at `$icon-size-large` around `$glyph-size-large`, in Edit's green (`icon-button-edit`), since adding is constructive. The spinner takes the glyph's size.
- **`.add-icon--held`**: the held check, the same box and green but the default cursor and no wash under the pointer, since it acts on nothing. It is worn alone, without `.add-icon`, so the plus's wash on focus never reaches it.
- **`.add-icon[data-state]`**: while the check shows, no wash and the default cursor, the held check's look, so nothing moves when the page swaps one for the other.
- **`.add-icon__glyphs`, `__check`, `__plus`**: the check and the plus stacked in one grid cell. The check is drawn along its stroke (a dash of 15, run to nothing) over `$arrive-duration` and fades out the same way; under reduced motion nothing is drawn or faded.
- **`.add-icon__eye`**: the Quick Look eye arriving in the plus's place, as `__plus` does. The ingredient form's duplicate warning stacks it under the check, whose + turns into the eye after an add rather than back into a plus (M12.48; [`ingredient-form.md`](ingredient-form.md), "The + in the duplicate warning").

**On a phone** the plus and the check have no rule of their own: each is a `$icon-size-large` (2rem) target, above WCAG 2.5.8's 24px.

**Forced colours.** The glyphs are drawn in `currentColor`, so they take the system's ink. The plus has no border, so the wash under the pointer, a background colour, is all that marks a hover there. The plus is a button, so focus shows the shared ring the `icon-button` mixin gives a button (MB.121), an outline, which forced colours keeps. The forced-colours pass over the compendium section is M14.3, a Wave 14 task (minted from MB.120).

## Stories and tests

Stories ([`index.stories.tsx`](../../src/components/AddIcon/index.stories.tsx), `Surfaces / Add Icon`): one `States` story, a grid of One Coven, Several Covens, Pending, Added, Returning and Held. Pending, Added and Returning are the plus's markup in those states, since only a press reaches them and the workshop serves no `/api/graphql`.

Tests: `tests/components/AddIcon/index.test.tsx` (the names and tips) and `tests/components/CompendiumCards/add-icon.test.tsx` (the add, the menu, busy, the check and the refusal). E2e: `tests/e2e/compendium-add.spec.ts`.

## What the plus is

The plus is Add to My Ingredients as an icon, at a compendium card's bottom right and beside the public entry page's pencil, so both are one control. Its tip and accessible name are both ADD followed by the entry's name (the name in `visually-hidden`), so a list of buttons tells one card's plus from the next and the words on screen are the name. It is a client component of its own because the card stays a server component and a press needs the browser (`claude-docs/components/compendium-cards.md`, "Contracts").

## Adding

Where the viewer may write in one coven alone, the plus adds there directly with no quantity: it sends `addCupboardEntry` and reads the page again, which then draws the check. With two or more covens it is always a menu of every one by name, and it never adds at once just because one coven lacks the entry. Choosing one adds there at once. A coven that holds the entry is shown disabled with a green check and named "<coven>, in its cupboard". The plus's own check says when every coven holds it.

A refusal is said in a callout under the plus, and the focus is given back to the plus, since the chosen item went with the menu. While it works the plus is `aria-disabled` and not `disabled` (the lone plus here, the menu's button in `MenuButton`), so the focus stays on it.

## After an add

The spinner turns into the check, drawn along its stroke. The check holds for `ADDED_HOLD_MS` and until the page has been read again, then cross-fades back to the plus (`returning`). `AddIcon` sets `data-state` and times the hold, and `useFade` keeps the check drawn while it fades and drops the fade under reduced motion, when the check and then the plus simply appear.

If the add left every coven holding the entry, the check stays until the page draws the held mark, so nothing jumps. While the check shows, the plus wears the held mark's look (no wash, default cursor), so the held mark takes its place with nothing moving.
