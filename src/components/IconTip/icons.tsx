import type { ReactElement } from 'react';

// The pencil every Edit control shows (MB.115): drawn at the glyph size in
// the control's own ink, and hidden from assistive technology, since the
// control around it is what names it. The ingredient form's rows and the
// admin lists' rows share it.

/** A pencil: open this to change it. */
export function PencilIcon(): ReactElement {
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
