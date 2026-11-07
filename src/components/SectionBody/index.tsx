'use client';

import type { ReactElement } from 'react';
import { useNavigationState } from '../../lib/navigation';
import { usePathname } from 'next/navigation';
import { skeletonFor } from '../../lib/navigation/skeleton-for';
import {
  SkeletonCover,
  SkeletonOverlay,
  heldPage,
  skeletonCoverHost,
  skeletonFadeHost,
  useLeavingSkeleton,
} from '../SkeletonFade';
import type { SectionBodyProps } from './types';

// The frame under a section's context row. While a navigation into it is on its way the old page is
// hidden and unreachable, and the destination's skeleton stands over it; not a `loading.tsx`, which
// would turn the guards' 404 and 403 into 200s (claude-docs/components/section-body.md).
export default function SectionBody({
  region,
  className,
  children,
}: SectionBodyProps): ReactElement {
  const { busy, href } = useNavigationState();
  const pathname = usePathname();
  const Shown = busy ? skeletonFor(region, href, pathname) : null;
  const skeleton = Shown ? <Shown /> : null;
  // When the wait ends the skeleton stays over the arrived page and fades
  // (SkeletonFade); without the hidden status, since the page has its own.
  const leaving = useLeavingSkeleton(skeleton && <main>{skeleton}</main>);

  // The page is held beneath the skeleton rather than swapped for it, so the scroll position
  // the browser saves for Back is the page's. The outer box is what the skeleton is laid over;
  // the section's own frame keeps the page as its direct children, so its flex column and gap
  // are untouched, and the skeleton stands in a copy of that frame.
  return (
    <div className={skeletonCoverHost(skeleton !== null)}>
      <div {...heldPage(skeleton !== null, `${className} ${skeletonFadeHost(leaving !== null)}`)}>
        {children}
        {leaving && <SkeletonOverlay>{leaving}</SkeletonOverlay>}
      </div>
      {skeleton && (
        <SkeletonCover className={className}>
          <main>
            <output className="visually-hidden">Loading</output>
            {skeleton}
          </main>
        </SkeletonCover>
      )}
    </div>
  );
}
