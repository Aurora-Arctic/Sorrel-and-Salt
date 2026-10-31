import { createElement, type ReactElement } from 'react';
import { SHAPES } from '../JarShelf/shapes';
import type { ChevronIconProps } from './types';

// The pencil every Edit control shows, in the control's own ink and hidden from assistive technology, as the control around it names it.

/** An X: close the pane it sits in. */
export function CloseIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3.5 3.5l9 9M12.5 3.5l-9 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

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

/** A cross: clear this, or no. Smaller than `CloseIcon`'s, to sit inside a field or a table cell. */
export function CrossIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** A chevron pointing down: this opens a list or a panel below it. */
export function ChevronIcon({
  className = 'chevron-icon',
  textSized = false,
}: ChevronIconProps): ReactElement {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width={textSized ? '1em' : undefined}
      height={textSized ? '1em' : undefined}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3.5 6l4.5 4.5L12.5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A tick: this is already held, as a compendium card's In Every Cupboard shows. */
export function CheckIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3 8.5l3.5 3.5L13 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The mystic eye: look at this without leaving the list (Quick Look); an almond eye whose iris is a tilted waxing crescent with a four-point star. */
export function MysticEyeIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {/* Stroke 1, not the set's 1.5, on purpose: a thinner outline. */}
      <path
        d="M1 8C2.8 5 5.2 3.5 8 3.5S13.2 5 15 8C13.2 11 10.8 12.5 8 12.5S2.8 11 1 8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.1 5.75A2.7 2.7 0 1 0 9.09 10.01A2.7 2.7 0 0 1 6.1 5.75z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M9.6 5.15L10.1 6.05L11 6.55L10.1 7.05L9.6 7.95L9.1 7.05L8.2 6.55L9.1 6.05z"
        fill="currentColor"
        stroke="none"
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

// Undo and redo, mirror images on the same 16-unit box, sized by attribute since a bare svg in a `.btn` has no size of its own.

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

/** An arrow down into a tray: save what is shown as a file; the backup codes wear it. */
export function DownloadIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M8 2v8M4.5 7 8 10.5 11.5 7M2.5 13.5h11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Two overlapping sheets: copy what another holds into this; Restore Original and Copy From Ingredient wear it. */
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
 * An open book with lines on its left page and a pencil over its right: Annotate, which writes the coven's notes over a compendium entry.
 * Stroke 1.25, not the set's 1.5, so the lines sit apart at 16px; the pencil is filled.
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

/** Three dots stacked, ⋮: more choices, in a menu; a More drawn with words keeps its chevron. */
export function DotsIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="3.25" r="1.25" fill="currentColor" />
      <circle cx="8" cy="8" r="1.25" fill="currentColor" />
      <circle cx="8" cy="12.75" r="1.25" fill="currentColor" />
    </svg>
  );
}

/** A bin: delete or remove this, a list card's lone Delete or Remove. */
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

/** A jar with a cloth tied over its mouth, the cloth's hem wavy: the coven's stock of an ingredient, worn by Edit Stock in place of the pencil. */
export function StockIcon(): ReactElement {
  return (
    <svg className="stock-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M4.5 6V5.125Q4.5 4.125 5.5 4.125h5Q11.5 4.125 11.5 5.125V6M4.25 6h7.5M4.5 6L3.5 8.5M11.5 6l1 2.5M3.5 8.5q1.125.75 2.25 0t2.25 0 2.25 0 2.25 0M4 9.25v3a1.75 1.75 0 0 0 1.75 1.75h4.5A1.75 1.75 0 0 0 12 12.25v-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2" // thinner than the pencil's 1.5, as the jar is drawn larger
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Four corner brackets pointing outward: Preview, which opens a spell full screen. */
export function PreviewIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A cauldron with two leaves tumbling in: Record a Working. */
export function CauldronIcon(): ReactElement {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Stroke 1.25, not the set's 1.5: the rim and leaves stay open at button size. */}
      <rect x="3.8" y="5.9" width="8.4" height="1.5" rx=".75" />
      <path d="M4.5 7.4C2.2 8.4 1.6 10.6 3 12.3 4.1 13.6 6 14 8 14s3.9-.4 5-1.7c1.4-1.7.8-3.9-1.5-4.9" />
      <path d="M5.4 14l-.8 1.2M10.6 14l.8 1.2" />
      <path
        transform="translate(5.9 3.05) rotate(-35) scale(.95)"
        d="M0 -2c1.7 1 1.9 2.5 0 4-1.9-1.5-1.7-3 0-4z"
      />
      <path
        transform="translate(10.4 3.05) rotate(35) scale(.88)"
        d="M0 -2c1.7 1 1.9 2.5 0 4-1.9-1.5-1.7-3 0-4z"
      />
    </svg>
  );
}

/** The jar shelf's round flask with a tick on its bulb: Complete Working. The flask is the shelf's own drawing, read from `SHAPES.flask` (its lid parts, and its body left open at the rim, as the shelf draws it); the tick is the icon's. */
export function CompleteIcon(): ReactElement {
  const { lid, body } = SHAPES.flask;
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* The shelf's 48-unit box scaled to fit the 16, its stroke widened to come out at the set's 1.5. */}
      <g transform="translate(-1 0) scale(.375)" strokeWidth="4">
        {lid.map((part, i) => createElement(part.el, { key: i, ...part.attrs }))}
        <path d={body.replace(/z$/, '')} />
        <path d="M16.8 28.5l5 5 9.6-10.5" />
      </g>
    </svg>
  );
}

/** A printer: print this page; the recipe page's Print and the backup codes wear it. */
export function PrintIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M4.5 6V2.5h7V6M4.5 11.5h-2v-5h11v5h-2M4.5 9.5h7v4h-7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
