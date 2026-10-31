'use client';

import type { ReactElement, ReactNode } from 'react';
import { useNavigationState } from '../../lib/navigation';
import Skeleton from '../Skeleton';
import {
  SkeletonCover,
  SkeletonOverlay,
  heldPage,
  skeletonFadeHost,
  useLeavingSkeleton,
} from '../SkeletonFade';

// The shell's body during a site-level navigation: the old page is hidden and one skeleton stands over
// it in its own `main`, with a hidden heading for the accessibility scan. Only a `main` target is
// answered here (`coven` and `admin` are `SectionBody`'s); a client part, as the state is the browser's.
const FRAME_CLASS = {
  wide: 'page-column',
  'with-nav': 'page-column',
  entry: 'page-column',
  narrow: 'page-frame page-frame--narrow skeleton-frame',
} as const;

const MainBody = ({ children }: { children: ReactNode }): ReactElement => {
  const { busy, target } = useNavigationState();
  const waiting = busy && target?.region === 'main' ? target : null;
  let frame: ReactElement | null = null;
  let className = '';
  if (waiting) {
    const skeleton = (
      <Skeleton
        shape={waiting.shape}
        title={waiting.title}
        action={waiting.action}
        tabs={waiting.tabs}
        filter={waiting.filter}
        menu={waiting.frame === 'with-nav' || waiting.frame === 'entry'}
        entry={waiting.frame === 'entry'}
        head={waiting.head}
        density={waiting.density}
      />
    );
    className = waiting.frame ? FRAME_CLASS[waiting.frame] : 'page-frame skeleton-frame';
    frame =
      waiting.shape === 'form' && waiting.frame === 'narrow' ? (
        <div className="page-frame__section panel">{skeleton}</div>
      ) : (
        skeleton
      );
  }
  // What stays over the arrived page while it fades: the frame without the
  // hidden heading, since the page has its own.
  const leaving = useLeavingSkeleton(frame ? <main className={className}>{frame}</main> : null);
  // The page is held beneath the skeleton rather than swapped for it, so the scroll
  // position the browser saves for Back is the page's
  // (claude-docs/components/skeleton-fade.md).
  return (
    <div className={skeletonFadeHost(leaving !== null)}>
      <div {...heldPage(frame !== null)}>{children}</div>
      {frame && (
        <SkeletonCover>
          <main className={className}>
            <h1 className="visually-hidden">Loading</h1>
            {frame}
          </main>
        </SkeletonCover>
      )}
      {leaving && <SkeletonOverlay>{leaving}</SkeletonOverlay>}
    </div>
  );
};

export default MainBody;
