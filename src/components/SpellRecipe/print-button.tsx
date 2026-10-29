'use client';

import type { ReactElement } from 'react';

// Print Spell: a plain button that opens the browser's print dialog. A print stylesheet alone is a
// feature only its author knows about, and a phone has no menu to reach for (M10.22). The
// button is hidden in print by `_print.scss`.

export default function PrintButton(): ReactElement {
  return (
    <button
      type="button"
      className="btn btn--quiet btn--small spell-recipe__print"
      onClick={() => window.print()}
    >
      Print Spell
    </button>
  );
}
