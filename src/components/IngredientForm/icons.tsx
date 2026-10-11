import type { ReactElement } from 'react';

// The form's two row icons, a reference row's edit and remove (MB.115):
// drawn at the glyph size in the button's own ink, and hidden from assistive
// technology, since the button around each is what names it.

/** A pencil: open this row to change it. */
export function EditIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M10.5 2.5l3 3L6 13H3v-3zM9 4l3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A cross: take this row out. */
export function RemoveIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
