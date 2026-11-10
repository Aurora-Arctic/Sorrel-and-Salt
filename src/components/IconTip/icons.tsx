import { createElement, type ReactElement } from 'react';
import { SHAPES } from '../JarShelf/shapes';
import type { ChevronIconProps, IconProps } from './types';

/** The stroked icon every set shares: a 16-unit box, round ends, the current colour, hidden from assistive technology since its control carries the name. */
export function Icon({
  path,
  strokeWidth = 1.5,
  className,
  viewBox = '0 0 16 16',
  children,
}: IconProps): ReactElement {
  return (
    <svg
      className={className}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {path === undefined ? children : <path d={path} />}
    </svg>
  );
}

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

/** Up and down arrows: a list's Reorder. */
export function ReorderIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M5 13V3M2.5 5.5L5 3l2.5 2.5M11 3v10M8.5 10.5L11 13l2.5-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

export function CrossIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

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

export function DotsIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="3.25" r="1.25" fill="currentColor" />
      <circle cx="8" cy="8" r="1.25" fill="currentColor" />
      <circle cx="8" cy="12.75" r="1.25" fill="currentColor" />
    </svg>
  );
}

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

export function StockIcon(): ReactElement {
  return (
    <svg className="stock-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M4.5 6V5.125Q4.5 4.125 5.5 4.125h5Q11.5 4.125 11.5 5.125V6M4.25 6h7.5M4.5 6L3.5 8.5M11.5 6l1 2.5M3.5 8.5q1.125.75 2.25 0t2.25 0 2.25 0 2.25 0M4 9.25v3a1.75 1.75 0 0 0 1.75 1.75h4.5A1.75 1.75 0 0 0 12 12.25v-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25" // thinner than the pencil's 1.5, as the jar is drawn larger
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

export function SupportIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M8 1.75c3.85 0 7 2.5 7 5.6s-3.15 5.6-7 5.6c-.85 0-1.65-.1-2.4-.3L2 14.5l.8-2.9C1.6 10.5.9 9.1.9 7.35.9 4.25 4.15 1.75 8 1.75z"
        fill="currentColor"
      />
      <path
        d="M6.25 5.75a1.75 1.75 0 1 1 2.45 1.6c-.55.3-.7.55-.7 1.1"
        fill="none"
        stroke="var(--icon-ground, var(--surface-page))"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="8" cy="10.15" r="0.85" fill="var(--icon-ground, var(--surface-page))" />
    </svg>
  );
}

export function HistoryIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
      <path
        d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9M2.5 2.5v3.2h3.2M8 5v3l2 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SproutIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M8 14V8M8 8C8 5.2 6.2 3.5 3 3.5 3 6.3 4.8 8 8 8zM8 9.5c0-2.6 1.6-4.2 4.5-4.2 0 2.6-1.6 4.2-4.5 4.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CircleCheckIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.25 8.25l1.75 1.75 3.75-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BubbleLinesIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3.5 3h9a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 12.5 11H7l-3 2.5V11h-.5A1.5 1.5 0 0 1 2 9.5v-5A1.5 1.5 0 0 1 3.5 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 6h6M5 8.25h3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PersonCheckIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle
        cx="6"
        cy="5.5"
        r="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.5 14a4.5 4.5 0 0 1 9 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 9l1.5 1.5 3-3.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PersonClockIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle
        cx="5.25"
        cy="5.5"
        r="2.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.25 14.25a4 4 0 0 1 5.5-3.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="11.25"
        cy="11.5"
        r="3.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.25 9.75v1.75l1.25.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FlagIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3.5 14.5V2M3.5 2.5h8l-1.75 3 1.75 3h-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArchiveBoxIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect
        x="2"
        y="3"
        width="12"
        height="3"
        rx=".75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 6v6.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 8.75h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Heading2Icon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M2.5 3v10M9 3v10M2.5 8H9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11 9.5a1.5 1.5 0 013 0c0 1-3 2-3 3.5h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Heading3Icon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M2.5 3v10M9 3v10M2.5 8H9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11 8.5h3l-1.7 2a1.5 1.5 0 11-1.3 2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PullQuoteIcon(): ReactElement {
  return <Icon path="M2.5 3v10M6 4.5h7.5M6 8h7.5M6 11.5h4.5" />;
}

export function BoldIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M4.5 2.5h3.75a2.5 2.5 0 010 5H4.5zM4.5 7.5H9a2.75 2.75 0 010 5.5H4.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ItalicIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M6.5 2.5h5M4.5 13.5h5M9.5 2.5l-3 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BulletListIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M6.5 4h7M6.5 8h7M6.5 12h7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="3" cy="4" r="1" fill="currentColor" />
      <circle cx="3" cy="8" r="1" fill="currentColor" />
      <circle cx="3" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

export function NumberListIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M7 4h6.5M7 8h6.5M7 12h6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2 3.5l1.2-.8v3M2 7.3a1 1 0 011.9.3c0 .7-1.9 1.2-1.9 2h2M2 11h1.9l-1 1a1 1 0 11-.9 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TableIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3.5 2.5h9a1 1 0 011 1v9a1 1 0 01-1 1h-9a1 1 0 01-1-1v-9a1 1 0 011-1zM2.5 6.5h11M8 6.5v7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FootnoteIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M2 6h6.5M2 10h9M2 14h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10.5 3.5l1.5-1v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** An open book with a line of text on each page: the Compendium. Stroke 1.25, as the Sigil and the Key, so the About pillar icons match. */
export function BookIcon(): ReactElement {
  return (
    <Icon
      strokeWidth={1.25}
      path="M8 4.5C6.5 3.5 4.5 3 1.5 3v9.5c3 0 5 .5 6.5 1.5 1.5-1 3.5-1.5 6.5-1.5V3c-3 0-5 .5-6.5 1.5M8 4.5V14M3.75 6.5h2.5M3.75 9h2.5M9.75 6.5h2.5M9.75 9h2.5"
    />
  );
}

/** Three overlapping rings, each crossing the other two: the Coven, a group you practise with. Stroke 1.25, as the other About icons. */
export function CovenIcon(): ReactElement {
  return (
    <Icon strokeWidth={1.25}>
      <circle cx="8" cy="5.9" r="3.9" />
      <circle cx="5.3" cy="10.3" r="3.9" />
      <circle cx="10.7" cy="10.3" r="3.9" />
    </Icon>
  );
}

export function SigilIcon(): ReactElement {
  return (
    <Icon strokeWidth={1.25}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5l.9 2.6 2.6.9-2.6.9L8 11.5l-.9-2.6-2.6-.9 2.6-.9z" />
    </Icon>
  );
}

export function KeyIcon(): ReactElement {
  return (
    <Icon strokeWidth={1.25}>
      <circle cx="5.5" cy="6" r="3" />
      <path d="M7.6 8.1l6 6M11.5 12l1.5-1.5M13.3 13.8l1.5-1.5" />
    </Icon>
  );
}
