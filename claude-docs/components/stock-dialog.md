# StockDialog

`src/components/StockDialog/` holds the Edit Stock button on a coven's ingredient and the dialog it opens: the jars the coven keeps of the ingredient (one per form) listed beside the chosen jar's quantity, unit and low-stock threshold. Everything done in it is saved together as one `saveStock` request. The service is the guard and the dialog only says its refusal; nothing on the page changes until the save has answered (no optimistic update).

## Contracts

### Props and entry points

- `forms` carry a ready-to-show Title Case `formLabel` in the order Add Form offers them. `jars` hold at most one jar per form.
- `openOn` is a variant id to open on. If the coven holds no jar of that form, the new row is among the form's opening values, not appended after mounting, so the dialog opens unedited: Save stays off and Cancel closes quietly until an amount is entered. An id not in `forms` is ignored.
- **On a coven card.** `covenCardActions` (`CovenCards/actions.tsx`, [`coven-cards.md`](coven-cards.md)) draws the button first in the card's foot when the entry carries `stock`; the Ingredients list and the Quick Look window call the same function. The page gives `stock` only to a role that may update stock, `rolePermits(role, { inventory: ['update'] })`. Hiding it is courtesy: the service refuses an observer and a non-member whatever the page shows ([`../db/stock.md`](../db/stock.md)).
- **On the entry page.** The Stock section carries the same button in its heading, and each jar of its shelf ([`jar-shelf.md`](jar-shelf.md)) opens the dialog through `StockJarButton`.
- **`StockJarButton`** is the same dialog behind a button of the caller's own, so what is saved and how it is refused cannot differ between the two doors. `onSaved` runs once after a save has closed the dialog and refreshed the page (Record a Working reads its preview again there).
- **From the compendium's three dots.** A compendium card, the Quick Look window and the public entry page list **Edit Stock** first in their dots; it mounts `StockDialogModal`, opened at once and closing back to the dots. A dialog opened by something other than its own button has a steward that holds whether it is open, and Modal restores nothing itself, so `returnTo` names where the focus goes on close.
  - `EditStock` (`IngredientEntry/edit-stock.tsx`) holds the choice: one coven opens it, several ask which first.
  - Forms and jars come from `readEntryStock` (`src/app/entry-stock.ts`), read per viewer in one batch and mapped by `stockDialogOf` (`src/app/coven-stock.ts`), the mapping the coven's own pages use too.
  - A compendium entry's forms are read per coven through that coven's proof (`heldFormsOf`), so an entry the curators have retired still lists them for a coven whose cupboard names it, and a coven that does not hold it reads none.
  - These pages are not a coven's, so `EditStock` passes `namesCoven`, which gives `StockDialogModal` a `coven` prop, and the eyebrow reads "Edit Stock for Whitethorn Coven". Modal names a dialog by its eyebrow then its title, so the coven is heard in the name. The coven's own pages pass no coven.
- **Over Quick Look** the dialog must open centred. `ModalButton` draws its `<dialog>` beside the button, which sits among the details window's `formalActions`; Modal's rule zeroing those actions' margins skips a dialog (`:not(dialog)`, [`modal.md`](modal.md)) so it keeps the `margin: auto` that centres it in the top layer. jsdom computes no layout, so this is checked in the browser, on `Pages / Ingredient Entry`'s `Quick Look`, state 'With Stock Dialog'.

### The button and the dialog

- **The form loads apart.** `index.tsx` holds the openers and `form.tsx` the form (react-hook-form, zod). `lazy-form.tsx` holds the one import of `form.tsx` (`stockFormModule`) and `LazyStockDialogForm`, which draws nothing until it arrives. Each opener starts it once the page is idle (`usePreloadWhenIdle`) and when its button is pointed at, focused or pressed (`ModalButton`'s `preload`), so the dialog opens with the form already there.

- A `ModalButton` ([`modal.md`](modal.md#modalbutton)) whose `IconTip` is passed as `ModalButton`'s `tip`, so the tip wraps the button and never the dialog ([`icon-tip.md`](icon-tip.md)). The icon is a jar with a cloth (`StockIcon`), not the pencil, since Edit beside it in the foot already wears the pencil; it is in `.icon-tip__edit`, the accent green, while the foot's Edit and Annotate use the plain text colour. The button is named "Edit Stock, Rosemary", so buttons down a list never share a name.
- The dialog is the `listed` size ([`modal.md`](modal.md#styling)): the default 32rem column plus half again plus a step of gap, so the fields keep the 32rem they would have in a dialog of their own and the list takes the rest.
- The form is a child of the modal so its discard guard reaches Close, Escape and the backdrop. Every jar is a row of the form's values (`rows.<i>`), drawn or not: react-hook-form keeps a value when its field is not on screen, so what was typed into one jar survives choosing another.
- The chosen form is held by its variant, because a row's index moves when an added row before it goes. When the chosen row has gone (an added form removed before Save), the first is used again.

### Layout: a list and the chosen jar

- **Columns.** A third to the list and two thirds to the fields. Below 30rem of dialog width the list stacks above the fields. The query is a container query on the dialog's body, so it follows the dialog's width, not the screen's; it styles what is inside the container, never the container itself, so the grid is the box within.
- **The list** has a button per jar, named by its form, with its amount beneath ("250 g", or "Unmeasured") and the card's `StockBadge` at the top right.
  - The badge moves by CSS alone, so the spoken order is unchanged. The button's name is the form, its marks and its amount, with commas heard and not seen (`.spoken-separator`): "Flower, Edited, 250 g". The space before a mark is its own margin rather than a column gap, because the spoken commas are flex items of no size and a gap would stand either side of each.
  - The badge is a button of its own, for its tip, so it sits beside the list's button inside the list item, not inside the button.
  - The chosen button carries `aria-current="true"`: the list says which jar the fields are for, and is not a set of toggles (`aria-pressed`) that could each be pressed off.
  - Every state is a tint of the accent green, with no grey. Each hover rule names whether its button is chosen, so neither depends on the other's order in the sheet. The tint fades over `$motion-short`, not a slow fade, and not at all under `prefers-reduced-motion`. Focus draws the ring inside, since the button fills its row and an outside ring would be clipped.
- **The chosen jar** is a `fieldset` named by its form alone (`aria-labelledby`, so "New" is not part of the group's name), under the dialog's `h2` title with an `h3` heading. Each field's label row is at least `$icon-size` tall, so Quantity, which has no ⓘ hint, starts as far below the heading as the others. The fields are [`StockFields`](stock-fields.md) under the prefix `rows.<i>`.
- **Opening.** Jars are listed by form from A to Z, whatever order they arrive in, and the first is chosen. The modal's first-field focus lands in its Quantity.
- **No jar.** The list says "There is no stock yet. Add a form to start." and the fields' column holds its place shut (`NoJar`), so the dialog keeps its size when the first form is added.
  - The heading line is held with the word "Form" in `$text-placeholder`, `aria-hidden` since the legend names the state. The line is as tall as a jar's because the h3's own line box sets both heights, not Remove's button, so the fields stand where a jar's do.
  - The fields are drawn empty and disabled in a throwaway `useForm` of their own, so nothing there is registered with the dialog's form: they never reach its values, its dirty check or the batch, and Save stays off.
- **Edited.** A form whose amounts differ from when the dialog opened shows "Edited" in its list button (`changed` in `batch.ts`, the same test the batch uses for an update). A form added in this dialog counts as edited, and its heading also says "New". A jar waiting to be removed shows no Edited mark: its strike says more.
  - The mark is `$accent`, as `icon-button-edit` paints it. On the chosen button it takes `$accent-hover`, because `$accent` on the chosen tint falls below WCAG's 4.5:1 for small text in light (4.43:1 at rest, 4.08:1 under the pointer). `$accent-hover` clears every state at the caption size over `$surface-card` (lowest 6.39:1).
- **Remove waits for Save.** A held jar is not deleted on the press: it is struck through and muted, its fields are put away (what was typed stays in the form), and the bin becomes an Undo button named "Undo Remove <form>". The delete is sent only on Save. A form added in this dialog and then removed was never saved, so it simply goes from the list and the first jar is chosen.
- **Add Form** offers the forms the list does not hold. A form waiting to be removed still holds its place, so it is not offered again; Undo brings it back. Add puts the form in the list with empty amounts, chooses it, focuses its Quantity (`setFocus` once its fields are drawn) and empties the box. With every form in the list the Add row is gone. The open list's options take the caption size the compact box's own text has (`Combobox/index.scss`, under `.field--compact`).

### Saving

`batch.ts` turns the rows into the `SaveStockInput` the mutation takes, `{ create, update, delete }`, and sends **only what changed**: a new row is a `create`; a staged removal is a `delete` of the jar's id, whatever was typed into it first; a held row whose amounts differ from how the dialog opened is an `update`; an untouched row is in no list, and a row added then removed was never a row. So no jar is in two lists, which the service refuses ("Each jar can be saved once").

Save is off until something differs from how the dialog opened (`isDirty`), and off again if the change is undone. Amounts go as numbers, `null` for an emptied box (`stockAmountsOf`). A unit changed with the numbers left as typed is sent as it is: nothing converts. The dialog has a client resolver (`amountResolver` in `batch.ts`) that refuses an unreadable amount on the row it belongs to, and Save opens the form holding the first one.

The service holds the guards and the atomicity: the whole batch is saved or none of it, in one audited transaction ([`../db/stock.md`](../db/stock.md)). Success closes the dialog through the modal's own close, then reads the page again (`usePendingNavigation().refresh()`), once however the button was pressed.

### A refusal

The dialog stays open with everything as typed and staged, and the card unchanged. `placeServerIssues` places each issue by its path in the batch through `rowFieldOf`; every jar's errors show at once. Every form with an issue gets a "!" mark in its list button, named "Needs a Fix", and the first such form is chosen so its error is on screen.

| Path                                                                      | Shown                                                    |
| ------------------------------------------------------------------------- | -------------------------------------------------------- |
| `update.<i>.input.<field>`, `create.<i>.input.<field>`                    | Beside that jar's box                                    |
| `create.<i>.variantId`                                                    | On the jar as a whole: the coven already holds this form |
| anything else (a delete, the batch, Forbidden, NotFound, a network fault) | One `Notice` of kind `error` above the fields, an alert  |

A message on a jar is a plain `field__error` paragraph linked to the jar's `fieldset` by `aria-describedby`; it has no alert role. Only the root Notice is an alert, drawn only for an issue no field holds. The service checks every row before it reads a jar, so a field refusal comes alone and shows marks and field errors with no summary alert.

## Used by

`covenCardActions`, the Stock section and shelf of the ingredient entry page ([`ingredient-entry.md`](ingredient-entry.md)), the compendium's three dots through `EditStock`, and the spell recipe's In the Cupboard lines ([`spell-recipe.md`](spell-recipe.md)). The fields are in [`stock-fields.md`](stock-fields.md), the shelf in [`jar-shelf.md`](jar-shelf.md), the guard and atomicity of `saveStock` in [`../db/stock.md`](../db/stock.md).
