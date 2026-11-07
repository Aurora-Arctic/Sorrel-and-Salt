import type { ReactElement } from 'react';

// Imported by path, not through `./index`, which is a client file.
export default function NewTabHint(): ReactElement {
  return <span className="visually-hidden"> (opens in a new tab)</span>;
}
