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
