'use client';

import { useLinkStatus } from 'next/link';
import type { ReactElement } from 'react';
import { useEnclosingLinkPending } from '../../lib/navigation/link-pending';
import './index.scss';

// A dot after a link's text that shows the click took while the server
// answers. It must sit inside a `Link`: the hook reads that link's pending
// state. Decorative, so hidden from assistive technology.
// claude-docs/components/link-hint.md
export default function LinkHint(): ReactElement {
  const { pending: byLink } = useLinkStatus();
  // A `PendingLink` navigates through the shared hook, which `useLinkStatus`
  // cannot see, so it reports its own state through a context.
  const byPendingLink = useEnclosingLinkPending();
  const pending = byLink || byPendingLink;
  return <span aria-hidden="true" className={pending ? 'link-hint is-pending' : 'link-hint'} />;
}
