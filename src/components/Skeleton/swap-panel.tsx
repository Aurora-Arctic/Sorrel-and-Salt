'use client';

import { type ReactElement, useState } from 'react';
import TabPanelLoading from '../TabbedPage/panel-loading';
import type { SwapPanelProps } from './types';

// The swap a tab's panel and a list's body share: the content, or
// the skeleton in its place while the next one is on its way. Keyed by which
// it shows, so each mounts afresh and fades in (the stylesheet): the
// skeleton as the press takes the old content away, and the new content as
// it replaces the skeleton. Content that was there from the server's render,
// before any press, is not marked as arrived and is shown at once.
const SwapPanel = ({
  pending,
  className,
  filter,
  shape,
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
      <TabPanelLoading filter={filter} shape={shape} />
    </div>
  ) : (
    <div key="content" className={className} data-arrived={swapped || undefined}>
      {children}
    </div>
  );
};

export default SwapPanel;
