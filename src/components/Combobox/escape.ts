import type { KeyboardEvent } from 'react';

// Escape on a picker's open list closes the list alone (MB.115). Downshift's
// `useSelect` closes it but lets the key through, unlike `useCombobox`'s
// typed box, and inside a modal the `<dialog>` then takes it as a close
// request, shutting the whole modal, or asking a changed form to discard.
// Marking the key handled stops the dialog's; Downshift's own handler still
// runs after this one and closes the list. With the list shut, Escape is
// left alone and closes the modal as ever.

/** The toggle button's `onKeyDown`, given whether its list is open. */
export const keepEscapeInList =
  (isOpen: boolean) =>
  (event: KeyboardEvent<HTMLElement>): void => {
    if (isOpen && event.key === 'Escape') event.preventDefault();
  };
