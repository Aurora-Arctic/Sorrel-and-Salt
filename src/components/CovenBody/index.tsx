'use client';

import type { ReactElement } from 'react';
import { useNavigationState } from '../../lib/navigation';
import Skeleton from '../Skeleton';
import type { CovenBodyProps } from './types';

// The frame under the coven's context row (M12.33). While a navigation aimed
// at the coven region is on its way, the old page is taken away at once, so
// nobody acts on the wrong coven's data, and the destination's skeleton
// stands in its place. Not a dimmed page and not a `loading.tsx`: a boundary
// would turn the guards' 404 and 403 into 200s (claude-docs/components/coven-body.md).
// The pages own their `<main>`, so the skeleton brings one: without it the
// landmark would vanish for the length of the wait.
export default function CovenBody({ children }: CovenBodyProps): ReactElement {
  const { busy, target } = useNavigationState();

  return (
    <div className="coven-layout">
      {busy && target?.region === 'coven' ? (
        <main>
          <Skeleton shape={target.shape} />
        </main>
      ) : (
        children
      )}
    </div>
  );
}
