import type { ReactElement } from 'react';

// The control's indicators, drawn by every box, hidden from assistive technology since the button around them names them.

export function ChevronIcon(): ReactElement {
  return (
    <svg className="chevron-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
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

export function PlusIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ClearIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** A sortable entry's grip, six dots ahead of its text: the sign it can be moved. */
export function GripIcon(): ReactElement {
  return (
    <svg className="combobox__entry-grip" viewBox="0 0 8 16" aria-hidden="true" focusable="false">
      {[2, 6].flatMap((cx) =>
        [4, 8, 12].map((cy) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.25" fill="currentColor" />
        )),
      )}
    </svg>
  );
}

/** Two links of a chain ahead of a linked entry's text: the sign it names a real row and opens it. */
export function LinkIcon(): ReactElement {
  return (
    <svg className="combobox__entry-mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M6.75 9.25a3 3 0 0 0 4.24 0l2.12-2.12a3 3 0 0 0-4.24-4.24l-.7.7M9.25 6.75a3 3 0 0 0-4.24 0L2.89 8.87a3 3 0 0 0 4.24 4.24l.7-.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
