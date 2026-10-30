import type { ReactElement } from 'react';

// An entry's marks, hidden from assistive technology since the entry's text names it. The chevron, plus and cross every box draws are the shared set's (IconTip/icons.tsx).

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
