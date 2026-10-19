import type { ReactElement } from 'react';

// The pencil every Edit control shows (MB.115): drawn at the icon size in
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

/** A plus: add one. The shared Add shows it alone at a phone's width. */
export function PlusIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M8 3v10M3 8h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Two chain links: this name goes to its own page. Drawn at the text's size by whoever places it. */
export function LinkIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M6.5 9.5a3 3 0 004.2 0l2-2a3 3 0 00-4.2-4.2l-.8.8M9.5 6.5a3 3 0 00-4.2 0l-2 2a3 3 0 004.2 4.2l.8-.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

/** Two overlapping sheets: copy what another holds into this. Restore Original and Copy From Ingredient wear it and the undo arrow (the owner's call, 2026-10-19). */
export function CopyIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M5.5 5.5h7v8h-7zM3.5 10.5v-8h7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * A sticky note with its corner folded: Annotate (M8.17), which writes the
 * coven's notes over a compendium entry rather than changing it, so not
 * Edit's pencil. A placeholder until the owner picks the icon; every
 * Annotate control draws this one function, so the swap is here alone.
 */
export function AnnotateIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M2.5 2.5h11v7l-4 4h-7zM13.5 9.5h-4v4M5 6h6M5 8.5h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
