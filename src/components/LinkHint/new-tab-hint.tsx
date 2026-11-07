import type { ReactElement } from 'react';

// The words a screen reader adds after a link that opens in a new tab, hidden from sight; written once so every such
// link says the same. Imported by path, not through `./index`, which is a client file.
export default function NewTabHint(): ReactElement {
  return <span className="visually-hidden"> (opens in a new tab)</span>;
}
