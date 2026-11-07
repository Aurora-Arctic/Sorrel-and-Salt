# ConfirmDialog

A yes-or-no question in a modal of its own, for a confirm with no form to ask over: the delete-spell, Make It Ours and Remove confirms. `src/components/ConfirmDialog/index.tsx`.

## Props

`title` (the dialog's name, "Delete Spell"), `question` (the thing it names in bold), `confirmLabel` and `busyLabel` (the verb and its present participle), `busy`, `tone` (`destructive` by default, `solid` when the answer can be taken back), `children` (a warning or refusal under the question), `onConfirm`, `onClose` and `returnTo` (where the focus goes if the opener is gone).

## Behaviour

- It is an alert dialog (`role="alertdialog"`), named by its title and described by its question. A test finds it with `alertdialog`, not `dialog`.
- Escape and Cancel are the safe answer; the focus lands on Cancel, never on the confirm. While `busy` the confirm shows a spinner and Cancel is held.
- Its owner unmounts it, so on closing it calls `giveFocusBack` (exported from `Modal/modal.tsx`) to return the focus to the opener.
- The confirm and Cancel row is `ConfirmAnswersRow` (`ConfirmDialog/answers.tsx`), which `ConfirmedAction`, the discard question and `Modal/confirm-question.tsx` draw too, so every confirm has the same row.

## Styling

`index.scss` sets the dialog's width and the question's spacing; the buttons are the site's.

## Tests

`tests/components/ConfirmDialog/index.test.tsx`.
