'use client';

import { type ReactElement, useState } from 'react';
import TabPanelLoading from '../TabbedPage/panel-loading';
import type { SwapPanelProps } from './types';

// The swap a tab's panel and a list's body share: the content, or the skeleton while the next is
// coming. Keyed by which it shows, so each mounts afresh and fades in; content from the server's
// first render is shown at once.
const SwapPanel = ({
  pending,
  className,
  filter,
  shape,
  count,
  density,
  card,
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
      <TabPanelLoading filter={filter} shape={shape} count={count} density={density} card={card} />
    </div>
  ) : (
    <div key="content" className={className} data-arrived={swapped || undefined}>
      {children}
    </div>
  );
};

export default SwapPanel;
