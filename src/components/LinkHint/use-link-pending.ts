'use client';

import { useLinkStatus } from 'next/link';
import { useEnclosingLinkPending } from '../../lib/navigation/link-pending';

/**
 * Whether the link around the caller has a navigation on its way. A `Link`
 * reports it through `useLinkStatus`; a `PendingLink` navigates through the
 * shared hook, which `useLinkStatus` cannot see, so it reports through a
 * context. Either one counts.
 */
export function useLinkPending(): boolean {
  const { pending: byLink } = useLinkStatus();
  return byLink || useEnclosingLinkPending();
}
