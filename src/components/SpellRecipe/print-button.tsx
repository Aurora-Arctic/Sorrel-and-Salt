'use client';

import type { ReactElement } from 'react';
import { PrintButton as PrintIconButton } from '../IconTip';

// Print Spell: an icon button that opens the browser's print dialog. A print stylesheet alone is a
// feature only its author knows about, and a phone has no menu to reach for. The recipe page's
// actions are hidden in print by `_print.scss`.

export default function PrintButton({ name }: { name: string }): ReactElement {
  return <PrintIconButton name={name} onClick={() => window.print()} />;
}
