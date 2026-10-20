# EditStock

`src/components/EditStock/` — the Edit button on a jar line and the dialog it opens (M9.9). It changes one jar's quantity, unit and low-stock threshold, saved as `updateStock`.

## Props

`workspaceId` and `jar`: `{ id, ingredient, form, quantity, unit, threshold }` (`types.ts`). `ingredient` is the name the coven gives the ingredient, which is the dialog's title; `form` is the variant's form as stored and is written through `formLabel`.

## The button and the dialog

A `ModalButton` ([`modal.md`](modal.md#modalbutton)). The button reads "Edit" and is named "Edit Stock, Rosemary, Oil" (`ariaLabel`), so the buttons down a list of jar lines never share a name and a screen reader hears which jar. The dialog is named the same way, from its head: the eyebrow "Edit Stock", the title the ingredient, the qualifier the form. The head holds the ingredient, not the jar's amounts, so it does not change as the fields are edited.

The body is a react-hook-form form around [`StockFields`](stock-fields.md) and a `FormActions` row (Save Stock, Cancel). The form is a child of the modal so its discard guard reaches Close, Escape and the backdrop, as the other edit dialogs' do.

## Saving

- Save is off until a field differs from the jar as the dialog opened (`isDirty`), and off again if the change is undone.
- It sends `updateStock(workspaceId, id, input)` with the three amounts only, as numbers, `null` for an emptied box: a field left out would keep its value, an emptied one clears it. `source` and `acquiredDate` are not sent, so the service leaves them alone.
- A unit changed with the numbers left as typed is sent as it is. Nothing converts.
- While the request is in flight Save is busy (`BusyButton`, "Saving Stock") and off.
- Success closes the dialog through the modal's own close, then refreshes the page (`usePendingNavigation().refresh()`), so the jar line is redrawn from the server. There is no optimistic update: until the answer arrives, the line shows the stock as it was.
- A refusal leaves the dialog open with everything as typed and the jar line unchanged. A VALIDATION issue naming a field (`quantityOnHand`, `unit`, `lowStockThreshold`) is placed beside it; anything else (Forbidden, NotFound, a network fault) is joined into one `Notice` of kind `error` above the fields, which is an alert.
- When a jar first gets a unit and has no threshold, the service writes the unit's default threshold ([`../db/stock.md`](../db/stock.md)); the page then shows it after the refresh.

## Who sees it

The button is drawn only for a member who may update stock: the Ingredients page passes `canEditStock` (`rolePermits(role, { inventory: ['update'] })`) down through `CovenCards` and `JarLines`. A viewer sees the jar lines with no Edit. The service refuses a viewer and a non-member regardless ([`../db/stock.md`](../db/stock.md)); hiding the button is courtesy, not the guard.

## Tests

`tests/components/EditStock/index.test.tsx`: the button's and the dialog's name, the dialog opening on the jar, Save off until a change and off again when reverted, what is sent (numbers, null for an empty box, zero kept, the unit changed with the numbers unconverted), closing, focus back and one refresh after a save, Save busy while in flight with nothing closed or refreshed early, a refusal in an alert with the typed values kept and no refresh, a refused amount placed beside its field, Cancel with and without changes, and a jar held without an amount.
