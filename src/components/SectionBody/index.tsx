'use client';

import type { ReactElement } from 'react';
import { useNavigationState } from '../../lib/navigation';
import Skeleton from '../Skeleton';
import { SkeletonOverlay, skeletonFadeHost, useLeavingSkeleton } from '../SkeletonFade';
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
  const skeleton =
    busy && target?.region === region ? (
      <Skeleton
        shape={target.shape}
        title={target.title}
        action={target.action}
        tabs={target.tabs}
        filter={target.filter}
        menu={target.frame === 'with-nav' || target.frame === 'entry'}
        entry={target.frame === 'entry'}
        head={target.head}
      />
    ) : null;
  // When the wait ends the skeleton stays over the arrived page and fades
  // (SkeletonFade); without the hidden heading, since the page has its own.
  const leaving = useLeavingSkeleton(skeleton && <main>{skeleton}</main>);

  return (
    <div className={`${className} ${skeletonFadeHost(leaving !== null)}`}>
      {skeleton ? (
        <main>
          <h1 className="visually-hidden">Loading</h1>
          {skeleton}
        </main>
      ) : (
        children
      )}
      {leaving && <SkeletonOverlay>{leaving}</SkeletonOverlay>}
    </div>
  );
}
