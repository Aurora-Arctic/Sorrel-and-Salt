'use client';

import type { ReactElement } from 'react';
import IconTip from '../IconTip';

/** A printer: print this page. */
function PrintIcon(): ReactElement {
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

/** Print on its own, in the dots' ink, for a role whose menu would hold nothing else. */
export default function PrintButton({ name }: { name: string }): ReactElement {
  return (
    <IconTip tip="Print">
      <button
        type="button"
        className="icon-tip__edit icon-tip__edit--ink"
        onClick={() => window.print()}
      >
        <PrintIcon />
        <span className="visually-hidden">Print {name}</span>
      </button>
    </IconTip>
  );
}
