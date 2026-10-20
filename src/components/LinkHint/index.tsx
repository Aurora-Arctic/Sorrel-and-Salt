'use client';

import type { ReactElement } from 'react';
import { useLinkPending } from './use-link-pending';
import './index.scss';

export { default as LinkIconHint } from './link-icon-hint';

// A dot after a link's text that shows the click took while the server
// answers. It must sit inside a `Link`: the hook reads that link's pending
// state. Decorative, so hidden from assistive technology. A link that wears
// the chain icon uses `LinkIconHint` instead, and has no dot.
// claude-docs/components/link-hint.md
export default function LinkHint(): ReactElement {
  const pending = useLinkPending();
  return <span aria-hidden="true" className={pending ? 'link-hint is-pending' : 'link-hint'} />;
}
