'use client';

import { useEffect } from 'react';

// Marks the row a client navigation's hash names, as loading the address would: CSS `:target` alone misses it, since
// the router moves the address with `history.pushState`. Replacing the hash sets the target without a history entry,
// and restoring the router's own state after keeps Back working.
const HashTarget = (): null => {
  useEffect(() => {
    if (!window.location.hash || document.querySelector(':target')) return;
    const state: unknown = window.history.state;
    // oxlint-disable-next-line sorrel/full-page-load-reports-leaving -- a hash alone is a fragment navigation, which loads nothing
    window.location.replace(window.location.hash);
    window.history.replaceState(state, '', window.location.href);
  }, []);
  return null;
};

export default HashTarget;
