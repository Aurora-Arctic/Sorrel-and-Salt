'use client';

import type { ReactElement } from 'react';
import IconTip, { PrintIcon } from '../IconTip';

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
