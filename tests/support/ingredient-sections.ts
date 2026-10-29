import { fireEvent, screen, within } from '@testing-library/react';

// The ingredient form's sections fold: an edit opens with every one closed, its fields in the page but
// hidden, so a role query finds none of them until its section is opened by its heading. An open
// variant's sections fold the same way, under its own headings.

/** A variant's sections, in page order, each named by its heading. */
export const VARIANT_SECTIONS = [
  'Identity',
  'Details & Care',
  'Correspondences',
  'Relations',
  'Sources',
];

/** Opens each of the ingredient form's sections named, by its heading's button. */
export function openSections(...titles: string[]): void {
  for (const title of titles) {
    fireEvent.click(screen.getByRole('button', { name: title, expanded: false }));
  }
}

/**
 * Opens each section named inside `scope`, an open variant's card, by its
 * heading's button, leaving any already open as it is.
 */
export function openSectionsIn(scope: HTMLElement, ...titles: string[]): void {
  for (const title of titles) {
    const toggle = within(scope).getByRole('button', { name: title });
    if (toggle.getAttribute('aria-expanded') === 'false') fireEvent.click(toggle);
  }
}
