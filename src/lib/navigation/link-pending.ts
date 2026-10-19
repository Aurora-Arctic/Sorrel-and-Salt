'use client';

import { createContext, useContext } from 'react';

// A `PendingLink` navigates through the shared hook rather than next/link's
// own handling, so `useLinkStatus` (what `LinkHint` reads) never sees it
// pending. The link says so here instead, for whatever sits inside it.
export const LinkPendingContext = createContext(false);

/** True while the `PendingLink` around the caller has a navigation on its way. */
export const useEnclosingLinkPending = (): boolean => useContext(LinkPendingContext);
