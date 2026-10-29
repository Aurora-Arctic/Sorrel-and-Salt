import type { KeyboardEvent } from 'react';

// Escape on a picker's open list closes the list alone, not the modal around it: marking the key handled stops the dialog's close request
// (claude-docs/components/combobox.md, "Component notes").

/** The toggle button's `onKeyDown`, given whether its list is open. */
export const keepEscapeInList =
  (isOpen: boolean) =>
  (event: KeyboardEvent<HTMLElement>): void => {
    if (isOpen && event.key === 'Escape') event.preventDefault();
  };
