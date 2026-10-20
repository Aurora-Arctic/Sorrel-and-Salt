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
 * An open book with lines on its left page and a pencil over its right:
 * Annotate (M8.17), which writes the coven's notes over a compendium entry
 * rather than changing it, so not Edit's bare pencil. The owner's choice
 * (2026-10-19), drawn at stroke width 1.25 rather than the set's usual 1.5,
 * also the owner's call, so the book's lines sit apart at 16px; the pencil
 * is filled, with no stroke. Every Annotate control draws this one function.
 */
export function AnnotateIcon(): ReactElement {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 4.5C6.5 3.5 4.5 3 1.5 3v9.5c3 0 5 .5 6.5 1.5 1.5-1 3.5-1.5 6.5-1.5V9.5M8 4.5V14M3.75 6.5h2.5M3.75 9h2.5" />
      <path
        fill="currentColor"
        stroke="none"
        d="M9.71 9.04L11.61 8.46 15.83 4.24 14.51 2.92 10.29 7.14z"
      />
    </svg>
  );
}

/**
 * Three dots stacked, ⋮: more choices, in a menu. A list card's More (M8.17,
 * the owner's call, 2026-10-20); a More drawn with words keeps its chevron.
 */
export function DotsIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="3.25" r="1.25" fill="currentColor" />
      <circle cx="8" cy="8" r="1.25" fill="currentColor" />
      <circle cx="8" cy="12.75" r="1.25" fill="currentColor" />
    </svg>
  );
}

/** A bin: delete or remove this. A list card's lone Delete or Remove (M8.17). */
export function BinIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M2.75 4.25h10.5M6.25 4.25V2.75h3.5v1.5M4 4.25l.75 9h6.5l.75-9M6.75 6.75v4M9.25 6.75v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
