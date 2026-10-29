'use client';

import type { ReactElement } from 'react';
import { useLinkPending } from './use-link-pending';
import './index.scss';

export { default as LinkIconHint } from './link-icon-hint';

// A dot after a link's text showing the click took. It must sit inside a `Link`, whose pending
// state it reads, and is hidden from assistive technology. A link with the chain icon uses
// `LinkIconHint` (claude-docs/components/link-hint.md).
export default function LinkHint(): ReactElement {
  const pending = useLinkPending();
  return <span aria-hidden="true" className={pending ? 'link-hint is-pending' : 'link-hint'} />;
}
