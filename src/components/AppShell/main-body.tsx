'use client';

import { usePathname } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';
import { useNavigationState } from '../../lib/navigation';
import { skeletonFor } from '../../lib/navigation/skeleton-for';
import {
  SkeletonCover,
  SkeletonOverlay,
  heldPage,
  skeletonCoverHost,
  skeletonFadeHost,
  useLeavingSkeleton,
} from '../SkeletonFade';

// The shell's body during a navigation: the old page is hidden and the destination's own skeleton
// stands over it in one `main`, with one hidden status; the skeleton draws the page's own heading. It draws every
// registered page whose section body is not standing for it (`SectionBody` draws the rest); a
// client part, as the state is the browser's.
const MainBody = ({ children }: { children: ReactNode }): ReactElement => {
  const { busy, href } = useNavigationState();
  const pathname = usePathname();
  const Shown = busy ? skeletonFor('main', href, pathname) : null;
  const frame = Shown ? <Shown /> : null;
  // What stays over the arrived page while it fades: the frame without the hidden status,
  // since the page has its own.
  const leaving = useLeavingSkeleton(frame && <main>{frame}</main>);
  // The page is held beneath the skeleton rather than swapped for it, so the scroll
  // position the browser saves for Back is the page's
  // (claude-docs/components/skeleton-fade.md).
  return (
    <div className={`${skeletonCoverHost(frame !== null)} ${skeletonFadeHost(leaving !== null)}`}>
      <div {...heldPage(frame !== null)}>{children}</div>
      {frame && (
        <SkeletonCover>
          <main>
            <output className="visually-hidden">Loading</output>
            {frame}
          </main>
        </SkeletonCover>
      )}
      {leaving && <SkeletonOverlay>{leaving}</SkeletonOverlay>}
    </div>
  );
};

export default MainBody;
