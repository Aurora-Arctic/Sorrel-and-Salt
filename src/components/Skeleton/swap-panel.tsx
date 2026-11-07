'use client';

import { type ReactElement, useState } from 'react';
import LoadingStatus from './loading-status';
import type { SwapPanelProps } from './types';

// The swap a tab's panel and a list's body share: the content, or the skeleton while the next is
// coming, with the one "Loading" status the skeleton leaves to it. Keyed by which it shows, so each mounts afresh and fades in; content from the server's
// first render is shown at once.
const SwapPanel = ({
  pending,
  className,
  skeleton,
  loadingMinHeight,
  children,
}: SwapPanelProps): ReactElement => {
  const [swapped, setSwapped] = useState(false);
  if (pending && !swapped) setSwapped(true);
  return pending ? (
    <div
      key="loading"
      className={className}
      style={loadingMinHeight ? { minHeight: loadingMinHeight } : undefined}
    >
      <LoadingStatus>{skeleton}</LoadingStatus>
    </div>
  ) : (
    <div key="content" className={className} data-arrived={swapped || undefined}>
      {children}
    </div>
  );
};

export default SwapPanel;
