import type { ReactElement } from 'react';

// The control's two indicators, drawn by every box: a typed one, the
// select-only one and the multi-select; and a sortable entry's grip. Hidden
// from assistive technology — what names them is the button around them, or
// nothing, where the whole control is the one target.

export function ChevronIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
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
