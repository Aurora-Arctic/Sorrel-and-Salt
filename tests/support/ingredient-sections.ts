import { fireEvent, screen } from '@testing-library/react';

// The ingredient form's sections fold (MB.115): an edit opens with every one
// closed, its fields in the page but hidden, so a role query finds none of
// them until its section is opened, as a person opens it, by its heading.

/** Opens each of the ingredient form's sections named, by its heading's button. */
export function openSections(...titles: string[]): void {
  for (const title of titles) {
    fireEvent.click(screen.getByRole('button', { name: title, expanded: false }));
  }
}
