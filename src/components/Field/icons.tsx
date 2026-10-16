import type { ReactElement } from 'react';

// The search field's mark, drawn on the 16-unit box Combobox's indicators
// use (`Combobox/icons.tsx`), so the two sit level at `$glyph-size`. Hidden
// from assistive technology: the button around it is named by its own text.

/** A magnifying glass: the search field's submit. */
export function MagnifierIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Undo and redo, mirror images on the same 16-unit box. Sized by attribute,
// since a bare svg in a `.btn` has no size of its own.

/** An arrow curving back: undo. */
export function UndoIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
      <path
        d="M5.5 3 2.5 6l3 3M2.5 6H9a4 4 0 0 1 0 8H6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** An arrow curving forward: redo. */
export function RedoIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
      <path
        d="M10.5 3 13.5 6l-3 3M13.5 6H7a4 4 0 0 0 0 8h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
