import type { ReactElement } from 'react';

// The words a screen reader adds after a link that opens in a new tab, hidden
// from sight. Written once so the three places that open a link in a new tab
// (the duplicate matches, the substitute summary, a reference's source) say the
// same thing. Imported by path, not through `./index`, which is a client file.
export default function NewTabHint(): ReactElement {
  return <span className="visually-hidden"> (opens in a new tab)</span>;
}
