# StockDialog

`src/components/StockDialog/` — the Edit Stock pencil on a coven's ingredient and the dialog it opens (M9.9). The dialog holds a row for each jar the coven keeps of the ingredient, one for each form: its quantity, unit and low-stock threshold. It can add a jar for a form the coven does not yet hold, and remove a jar. Everything done in it is saved together, as one `saveStock` request.

It replaces the one-jar `EditStock` dialog of the first build (the owner's call, 2026-10-20): editing one jar at a time from each jar line meant a pencil per line and no way to add a form, so the pencil moved to the card's foot and the dialog took the whole ingredient.

## Props

`workspaceId`, `ingredientId`, `ingredientName`, `forms` and `jars` (`types.ts`).

- `ingredientName` is the name the coven gives the ingredient, the dialog's title and the pencil's name.
- `forms` is every form the ingredient comes in, each `{ variantId, label }` with the label ready to show (`formLabel`, Title Case), in the order Add Form offers them.
- `jars` is the jars held, `{ id, variantId, quantity, unit, threshold }`, at most one for a form.

## Where it is mounted

`covenCardActions` (`CovenCards/actions.tsx`, [`coven-cards.md`](coven-cards.md)) draws it in the card's foot when the entry carries `stock` (the forms and jars), so the Ingredients list and the Quick Look window, which calls the same function, show the same pencil. The page gives `stock` only to a role that may update stock, `rolePermits(role, { inventory: ['update'] })`, so a viewer gets no pencil. Hiding it is courtesy: the service refuses a viewer and a non-member whatever the page shows ([`../db/stock.md`](../db/stock.md)).

The entry page's Stock section carries the same dialog behind a pencil in its heading (M12.29).

## The button and the dialog

A `ModalButton` ([`modal.md`](modal.md#modalbutton)). The button is a pencil (`PencilIcon`) in `.icon-tip__edit icon-tip__edit--plain` with an `IconTip` reading "Edit Stock", passed as `ModalButton`'s `tip` so the tip wraps the button and never the dialog ([`icon-tip.md`](icon-tip.md)). It is named "Edit Stock, Rosemary" (`ariaLabel`), so the pencils down a list never share a name. The dialog's head is the eyebrow "Edit Stock" over the ingredient's name.

The body is a react-hook-form form around the rows, an Add Form box and a `FormActions` row (Save Stock, Cancel). The form is a child of the modal so its discard guard reaches Close, Escape and the backdrop.

## A row

A `fieldset` named by its legend, the form ("Dried Leaf"). It holds [`StockFields`](stock-fields.md) at `size="compact"` under the prefix `rows.<i>`, so Quantity, Unit and Low Stock At sit on one line, and a Remove bin beside them (`BinButton`, tipped "Remove", named "Remove <form>").

**Remove is staged.** A jar held is not deleted on the press: the row is struck through, its fields put away (what was typed stays in the form) and an Undo button, named "Undo Remove <form>", takes it back. The delete is sent only on Save. A row added in this dialog and then removed was never saved, so it simply goes.

## Add Form

A `ComboboxSelect` labelled "Add Form" (placeholder "Choose form") offering the forms no row holds. Choosing one appends an empty row for it, the box returns to empty, and the form leaves the list. A form whose row is staged for removal still holds its row, so it is not offered again; Undo brings the row back instead. With a row for every form the box is gone, since there is nothing left to add.

## Saving

`batch.ts` turns the rows into the `SaveStockInput` the mutation takes, `{ create, update, delete }`, and sends **only what changed**:

- a new row is a `create` of `{ variantId, input }`;
- a staged removal is a `delete` of the jar's id, whatever was typed into it first;
- a held row whose amounts differ from how the dialog opened is an `update` of `{ id, input }`;
- an untouched row is in no list. So no jar is in two lists, which the service refuses ("Each jar can be saved once").

Save is off until something differs from how the dialog opened (`isDirty`) and off again if the change is undone. Amounts go as numbers, `null` for an emptied box (`stockAmountsOf`). A unit changed with the numbers left as typed is sent as it is: nothing converts. While the request is in flight Save is busy ("Saving Stock").

The service holds the guards and the atomicity: the whole batch is saved or none of it, in one audited transaction ([`../db/stock.md`](../db/stock.md)). The dialog adds nothing to them.

Success closes the dialog through the modal's own close, then reads the page again (`usePendingNavigation().refresh()`), once however the button was pressed. There is no optimistic update: the card shows the stock as it was until the answer arrives.

## A refusal

The dialog stays open with everything as typed and staged, and the card unchanged. `placeServerIssues` places each issue by its path in the batch, through `rowFieldOf`:

| Path                                                                      | Shown                                                    |
| ------------------------------------------------------------------------- | -------------------------------------------------------- |
| `update.<i>.input.<field>`                                                | Beside that row's box                                    |
| `create.<i>.input.<field>`                                                | Beside that row's box                                    |
| `create.<i>.variantId`                                                    | On the row as a whole: the coven already holds this form |
| anything else (a delete, the batch, Forbidden, NotFound, a network fault) | One `Notice` of kind `error` above the rows, an alert    |

A message on a row is a plain `field__error` paragraph, linked to the row's `fieldset` by `aria-describedby`; it has no alert role. Only the root Notice is an alert.

## Tests

- `tests/components/StockDialog/`: the pencil's and the dialog's names, a row per jar, what is sent (only changed rows; numbers; null for an empty box; zero kept), a staged Remove and its Undo, Add Form and its list shrinking, Save off until a change, busy while in flight, closing, focus back and one refresh after a save, a refusal placed on its row or in the alert with the typed values kept, and Cancel with and without changes.
- Story 24 (`tests/e2e/stories/03-ingredients.spec.ts`) walks it in the browser: edit, Add Form, staged Remove and Undo, the keyboard, a refusal keeping what was typed, a network failure, Escape over Quick Look, and a viewer with no pencil. Story 23 reads a jar's stock through the same helper.
- Ladle (`Ingredients / Stock Dialog`): the pencil closed, the dialog open on two jars, on none, with every form held, with a Remove staged, and in the phone sizes of both themes. `OpenRefused` types an amount and presses Save, which shows the failure the workshop gives, having no server. A refusal worded by the service cannot be drawn there.
