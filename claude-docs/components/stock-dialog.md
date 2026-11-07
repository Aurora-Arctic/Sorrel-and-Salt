# StockDialog

`src/components/StockDialog/` holds the Edit Stock button on a coven's ingredient and the dialog it opens. The dialog lists the jars the coven keeps of the ingredient, one for each form, and shows the chosen jar's quantity, unit and low-stock threshold beside the list. It can add a jar for a form the coven does not yet hold, and remove a jar. Everything done in it is saved together, as one `saveStock` request. The service is the guard and the dialog only says its refusal; nothing on the page changes until the save has answered. Props are in `src/components/StockDialog/types.ts`.

## Contracts

### Props and entry points

- `ingredientName` is the name the coven gives the ingredient: the dialog's title and the button's name. `forms` carry a ready-to-show Title Case label (`formLabel`), in the order Add Form offers them. `jars` hold at most one jar per form.
- `openOn` is a form's variant id to open on, in place of the first jar. If the coven holds no jar of that form, a new row for it is added first, as Add Form would, and its Quantity is focused. The row is among the form's opening values, not appended after mounting, so the dialog opens unedited: Save stays off and Cancel closes quietly until an amount is entered. An id that is not one of `forms` is ignored.
- **On a coven card.** `covenCardActions` (`CovenCards/actions.tsx`, [`coven-cards.md`](coven-cards.md)) draws the button in the card's foot, first, ahead of Edit or Annotate, when the entry carries `stock`. The Ingredients list and the Quick Look window call the same function, so they show the same button. The page gives `stock` only to a role that may update stock, `rolePermits(role, { inventory: ['update'] })`. Hiding it is courtesy: the service refuses an observer and a non-member whatever the page shows ([`../db/stock.md`](../db/stock.md)).
- **On the entry page.** The Stock section carries the same dialog behind the same button in its heading. Each jar of its shelf ([`jar-shelf.md`](jar-shelf.md)) opens it through `StockJarButton`.
- **`StockJarButton`** is a second export of the same file: the same dialog behind a button of the caller's own, with a required `ariaLabel` (the shelf names it "Edit Stock, <entry name>, <Form>"), an optional `className`, and `children` as what the button shows, with no icon and no tip. `onSaved` runs once after a save has closed the dialog and refreshed the page (Record a Working reads its preview again there). It wraps the one `StockDialogForm` the default export uses, with the same eyebrow and title, so there is a single implementation and the shelf only chooses where it opens.
- **From the compendium's three dots.** A compendium card, the Quick Look window and the public entry page list **Edit Stock** first in their dots. Choosing it mounts `StockDialogModal`, the same `StockDialogForm` in a `Modal` with the eyebrow "Edit Stock" over the ingredient's name, opened at once and closing back to the dots. A dialog opened by something other than its own button has a steward that holds whether it is open, and Modal restores nothing itself, so `returnTo` names where the focus goes on close.
  - `EditStock` (`IngredientEntry/edit-stock.tsx`) holds the choice: one coven opens it, several ask which first.
  - Forms and jars come from `readEntryStock` (`src/app/entry-stock.ts`), read per viewer in one batch and mapped by `stockDialogOf` (`src/app/coven-stock.ts`), the mapping the coven's own pages use too. A save reads the page again as it does elsewhere.
  - A compendium entry's forms are read per coven through that coven's proof (`heldFormsOf`), so an entry the curators have retired still lists them for a coven whose cupboard names it, and a coven that does not hold it reads none.
  - These pages are not a coven's, so the dialog names the coven it writes to: `EditStock` passes `namesCoven`, which gives `StockDialogModal` a `coven` prop, and the eyebrow reads "Edit Stock for Whitethorn Coven" over the ingredient's name. Modal names a dialog by its eyebrow then its title, so the coven is heard in the name, "Edit Stock for Whitethorn Coven, Testwort". The coven's own pages pass no coven: the eyebrow stays "Edit Stock" and the dialog is named "Edit Stock, Testwort".
- **Over Quick Look** the dialog opens centred, as any modal does. `ModalButton` draws its `<dialog>` beside the button, so in Quick Look it sits among the details window's `formalActions`; Modal's rule zeroing those actions' margins skips a dialog (`:not(dialog)`, [`modal.md`](modal.md)) so the dialog keeps the `margin: auto` that centres it in the top layer. jsdom computes no layout, so this is checked in the browser, on `Pages / Ingredient Entry`'s `Quick Look`, state 'With Stock Dialog'.

### The button and the dialog

- A `ModalButton` ([`modal.md`](modal.md#modalbutton)). The button is a jar with a cloth tied over it (`StockIcon`, since Edit beside it in the foot already wears the pencil) in `.icon-tip__edit`, the accent green. The foot's Edit and Annotate use the plain text colour. An `IconTip` reads "Edit Stock", passed as `ModalButton`'s `tip` so the tip wraps the button and never the dialog ([`icon-tip.md`](icon-tip.md)). The button is named "Edit Stock, Rosemary" (`ariaLabel`), so buttons down a list never share a name.
- The dialog is the `listed` size (`size="listed"`, [`modal.md`](modal.md#styling)): half the default 32rem column again plus a step of gap, so the fields keep the 32rem they would have in a dialog of their own and the list takes the rest. That is 49rem of body, capped at the window as every size is.
- The body is a react-hook-form form around two columns and a `FormActions` row (Save, Cancel). The form is a child of the modal so its discard guard reaches Close, Escape and the backdrop. Every jar is a row of the form's values (`rows.<i>`), drawn or not: react-hook-form keeps a value when its field is not on screen, so what was typed into one jar survives choosing another.
- The chosen form is held by its variant, because a row's index moves when an added row before it goes. When the chosen row has gone (an added form removed before Save), the first is used again.

### Layout: a list and the chosen jar

- **Columns.** The body splits one third to the list and two thirds to the fields (`minmax(0, 1fr) minmax(0, 2fr)`), giving a long form name room. A rule down the list's side divides them. The grid's cells stretch to the row, so the rule runs the height of the taller column.
- **Narrow.** Below 30rem of dialog width the list stacks above the fields. The query is a container query on the dialog's body (`container: stock-dialog / inline-size`), so it follows the dialog's width rather than the screen's; a container query styles what is inside the container, never the container itself, so the grid is the box within. Container size queries are Baseline Widely Available.
- **The list** has a button per jar, named by its form, with its amount beneath ("250 g", or "Unmeasured") and the card's `StockBadge` (Low Stock or Out of Stock) at the top right, on the name's line.
  - The badge moves by CSS alone, so the spoken order is unchanged. The button's name is the form, its marks and its amount read as one name with commas heard and not seen (`.spoken-separator`), "Flower, Edited, 250 g". The space before a mark is its own margin rather than a column gap, because the spoken commas are flex items of no size and a gap would stand either side of each.
  - The badge is a button of its own, for its tip, so it sits beside the list's button inside the list item rather than inside the button.
  - The chosen button carries `aria-current="true"`: the list says which jar the fields are for, and is not a set of toggles (`aria-pressed`) that could each be pressed off.
  - Every state is a tint of the accent green, with no grey: chosen `$fill-highlight` (12%), a touch stronger under the pointer (18%), and an unchosen one halfway there (6%) under the pointer. Each hover rule names whether its button is chosen, so neither depends on the other's order in the sheet. The tint fades in over `$motion-short` (150ms), not the theme's 400ms fade, and not at all under `prefers-reduced-motion`.
  - Keyboard focus draws the shared focus ring inside the button (`focus-ring($placement: inset)`), since the button fills its row and an outside ring would be clipped.
- **The chosen jar** is a `fieldset` named by its form alone (`aria-labelledby`, so "New" is not part of the group's name), headed by an `h3` with the form's name under the dialog's `h2` title. The heading keeps the small-caps heading font every `h3` wears. A Remove bin sits at the heading line's end (`BinButton`, tipped "Remove", named "Remove <form>"). Beneath are [`StockFields`](stock-fields.md) at full size under the prefix `rows.<i>`, one under another: Quantity, Unit, then Low Stock At, each the column's full width. Each field's label row is at least `$icon-size` tall, so Quantity, which has no ⓘ hint, starts as far below the heading as the others.
- **Opening.** Jars are listed by form from A to Z, whatever order they arrive in, and the first is chosen. The modal's first-field focus lands in its Quantity.
- **No jar.** The list says "There is no stock yet. Add a form to start." over the Add row, and the fields' column holds its place shut (`NoJar`): the same two columns and divider, so the dialog keeps its size when the first form is added. On a phone the column stacks below the list.
  - The heading line is held, with the plain word "Form" at the heading's own size and weight in `$text-placeholder`, the ink an input's placeholder wears, a step quieter than `$text-muted` (`.stock-dialog__placeholder`). It is `aria-hidden`, since the legend names the state. The line is as tall as a jar's because the h3's own line box sets both heights, not Remove's button (`.stock-dialog__head.is-blank`, whose `$icon-size` minimum never binds), so the fields stand where a jar's do.
  - Quantity, Unit and Low Stock At are drawn empty and disabled, with their labels and InfoTips, and no Remove. They live in a throwaway `useForm` of their own, so nothing there is registered with the dialog's form: they never reach its values, its dirty check or the batch, and Save stays off. A screen reader hears the group as "No Form Chosen", described by a hidden "Add a form to enter its stock."
- **Edited.** A form whose amounts differ from when the dialog opened shows "Edited" in its list button (`changed` in `batch.ts`, the same test the batch uses for an update). A form added in this dialog counts as edited, and its heading also says "New". A jar waiting to be removed shows no Edited mark: its strike says more.
  - The mark is `$accent`, as `icon-button-edit` paints it, so it reads as the edit it records. On the chosen button it takes `$accent-hover` (a step further from the ground in each theme), because `$accent` on the chosen tint falls below WCAG's 4.5:1 for small text in light (4.43:1 at rest, 4.08:1 under the pointer). No new token: `$accent-hover` clears every state.
  - Contrast at the caption size over `$surface-card`, the tint mixed in sRGB as `color-mix()` does: unchosen (`$accent`) 5.20:1 light and 7.22:1 dark at rest, 4.81:1 and 6.55:1 under the pointer; chosen (`$accent-hover`) 7.24:1 light and 7.22:1 dark at rest, 6.66:1 and 6.39:1 under the pointer.
- **Remove waits for Save.** A held jar is not deleted on the press. Its list item is struck through and muted, its badge hidden, its fields put away (what was typed stays in the form) with a line saying it goes when the dialog is saved, and the heading's bin becomes an Undo button named "Undo Remove <form>". The delete is sent only on Save. A form added in this dialog and then removed was never saved, so it simply goes from the list, and the first jar is chosen.
- **Add Form** sits under the list on one line: a `ComboboxSelect` in a compact `FieldShell` (`.field--compact`), labelled "Add Form" (placeholder "Choose a form"), offering the forms the list does not hold, and an Add button, off until a form is picked. Add puts the form in the list with empty amounts, chooses it, focuses its Quantity (`setFocus` once its fields are drawn) and empties the box. A form waiting to be removed still holds its place, so it is not offered again; Undo brings it back. With every form in the list the Add row is gone. The open list's options take the caption size the compact box's own text has (`Combobox/index.scss`, under `.field--compact`).

### Saving

`batch.ts` turns the rows into the `SaveStockInput` the mutation takes, `{ create, update, delete }`, and sends **only what changed**:

- a new row is a `create` of `{ variantId, input }`;
- a staged removal is a `delete` of the jar's id, whatever was typed into it first;
- a held row whose amounts differ from how the dialog opened is an `update` of `{ id, input }`;
- an untouched row is in no list, and a row added then removed was never a row. So no jar is in two lists, which the service refuses ("Each jar can be saved once").

Save is named Save Stock and is off until something differs from how the dialog opened (`isDirty`), and off again if the change is undone. Cancel stays beside it, since closing throws changes away (after asking). While the request is in flight Save is busy ("Saving Stock"). Amounts go as numbers, `null` for an emptied box (`stockAmountsOf`). A unit changed with the numbers left as typed is sent as it is: nothing converts.

The service holds the guards and the atomicity: the whole batch is saved or none of it, in one audited transaction ([`../db/stock.md`](../db/stock.md)). Success closes the dialog through the modal's own close, then reads the page again (`usePendingNavigation().refresh()`), once however the button was pressed. There is no optimistic update: the card shows the stock as it was until the answer arrives.

### A refusal

The dialog stays open with everything as typed and staged, and the card unchanged. `placeServerIssues` places each issue by its path in the batch through `rowFieldOf`. Every jar's errors show at once. Every form with an issue gets a "!" mark in its list button, with the accessible name "Needs a Fix", and the first such form is chosen so its error is on screen.

| Path                                                                      | Shown                                                    |
| ------------------------------------------------------------------------- | -------------------------------------------------------- |
| `update.<i>.input.<field>`                                                | Beside that jar's box                                    |
| `create.<i>.input.<field>`                                                | Beside that jar's box                                    |
| `create.<i>.variantId`                                                    | On the jar as a whole: the coven already holds this form |
| anything else (a delete, the batch, Forbidden, NotFound, a network fault) | One `Notice` of kind `error` above the fields, an alert  |

A message on a jar is a plain `field__error` paragraph under its heading, linked to the jar's `fieldset` by `aria-describedby`; it has no alert role. Only the root Notice is an alert, drawn only for an issue no field holds: a refusal placed wholly on fields shows the marks and the field errors with no summary alert.

## Testing

Tests are in `tests/components/StockDialog/`. Story 24 (`tests/e2e/stories/03-ingredients.spec.ts`) walks the dialog in the browser through `stockEditor` (`tests/e2e/stories/coven-ingredients.ts`), which chooses a form in the list before reaching its fields; story 23 reads a jar's stock through the same helper.

## Stories

`src/components/StockDialog/index.stories.tsx`, titled "Ingredients / Stock Dialog": `States` with Open, Open On A Held Form, Open On A Form Not Held, Open None Held, Open All Held, Open Removing, Open Refused and Open Failed. The last two answer Save Stock with a refusal the real server can send, stubbed in the shape `src/graphql/errors.ts` gives it through the workshop's fake API (`useMockHandlers` in `.storybook/mock-api.ts`); with neither state a save is accepted.

- Open Refused is one `VALIDATION` error with an issue on each edited jar's box. Both forms carry the mark, the first is chosen with its error in view, a staged removal stays staged, and no alert shows: the service checks every row before it reads a jar, so field issues come alone.
- Open Failed is the whole batch's `NOT_FOUND`, "No such stock in this coven", which names no field, so it is the alert and no form is marked. A network failure takes the same path with the generic sentence, so it has no story.

## Used by

`covenCardActions`, the Stock section and shelf of the ingredient entry page ([`ingredient-entry.md`](ingredient-entry.md)), the compendium's three dots through `EditStock`, and the spell recipe's In the Cupboard lines ([`spell-recipe.md`](spell-recipe.md)).

## Not here

- The fields themselves: [`stock-fields.md`](stock-fields.md).
- The authorization and atomicity of `saveStock`: [`../db/stock.md`](../db/stock.md).
- The shelf of jars: [`jar-shelf.md`](jar-shelf.md).
