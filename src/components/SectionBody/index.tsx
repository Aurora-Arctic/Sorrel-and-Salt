'use client';

import type { ReactElement } from 'react';
import { useNavigationState } from '../../lib/navigation';
import Skeleton from '../Skeleton';
import type { SectionBodyProps } from './types';

// The frame under a section's context row (M12.33): the coven's, or the admin
// area's. While a navigation aimed at this section's region is on its way, the
// old page is taken away at once, so nobody acts on the wrong coven's data, and
// the destination's skeleton stands in its place. The context row above it,
// with the section's nav, is outside this frame and stays. Not a dimmed page
// and not a `loading.tsx`: a boundary would turn the guards' 404 and 403 into
// 200s (claude-docs/components/section-body.md).
// The pages own their `<main>`, so the skeleton brings one: without it the
// landmark would vanish for the length of the wait, and so does the page's
// level-one heading, so it brings a hidden one.
export default function SectionBody({
  region,
  className,
  children,
}: SectionBodyProps): ReactElement {
  const { busy, target } = useNavigationState();

  return (
    <div className={className}>
      {busy && target?.region === region ? (
        <main>
          <h1 className="visually-hidden">Loading</h1>
          <Skeleton shape={target.shape} />
        </main>
      ) : (
        children
      )}
    </div>
  );
}
