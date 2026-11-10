# ConfirmedAction

An action that asks first, in a modal, then sends: the creation and role controls, Impersonate, the pause switch and the invitations' Revoke each build one. `src/components/ConfirmedAction/index.tsx`, with its props in `types.ts` and a story in `index.stories.tsx`. It lived in `UserList/` until MB.124 and moved because the invitations, passkeys, support and document panels use it too.

## Behaviour

- Its steps are `idle`, `confirming` and `sending` (`ConfirmStep`). The row's button opens the modal; the modal's `ConfirmAnswersRow` (`ConfirmDialog/answers.tsx`) is the same confirm and Cancel row `ConfirmDialog` draws.
- `send(note?)` is the write; a refusal rejects and is said in a callout (or, inside a modal, a notice). `onSent` replaces the default re-read of the page; `announcement` is said in the status region after a success.
- `withNote` offers an optional reason; its field class is `confirmed-action__note`. The confirm stays pressable whatever the reason holds (R4): a press with a reason past its limit sends nothing and puts `reasonProblem`'s limit message (`src/modules/identity/validation/reason.ts`) on the Reason field, which announces it; typing clears it.

## Styling

`index.scss` holds the modal's note field only; the buttons are the site's.

## Tests

`tests/components/ConfirmedAction/index.test.tsx`.
