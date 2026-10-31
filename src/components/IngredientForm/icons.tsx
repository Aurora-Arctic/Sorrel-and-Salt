import type { ReactElement } from 'react';

// The form's row icons, drawn at the icon size in the button's own ink and hidden from assistive
// technology, since the button around each names it. The pencil is every Edit control's, the admin
// lists' too, so it lives with the tip they share.

export { PencilIcon as EditIcon } from '../IconTip';

/**
 * A page with a pencil at its corner: change the source itself, for every
 * entry citing it. Not the row's own pencil, which opens the row for its
 * Locator, so the two in one row do not look the same.
 */
export function SourceEditIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M7 14H3.5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h5l3 3v2.5M8.5 2v3h3M13 9.5l1.5 1.5-4 4H9v-1.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A cross: take this row out. The shared set's cross, which the type-ahead's clear draws too. */
export { CrossIcon as RemoveIcon } from '../IconTip/icons';

/** An arrow up, the way a folk name rises to be the display name: promote this row. */
export function PromoteIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M8 13V3M3.75 7.25 8 3l4.25 4.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
