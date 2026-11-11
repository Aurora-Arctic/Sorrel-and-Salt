'use client';

import type { ReactElement } from 'react';
import IconTip, { IconButton, PrintIcon } from '../IconTip';

/** Print on its own, in the dots' ink, for a role whose menu would hold nothing else. */
export default function PrintButton({ name }: { name: string }): ReactElement {
  return (
    <IconTip tip="Print">
      <IconButton
        label={`Print ${name}`}
        icon={<PrintIcon />}
        className="icon-tip__edit--ink"
        onClick={() => window.print()}
      />
    </IconTip>
  );
}
