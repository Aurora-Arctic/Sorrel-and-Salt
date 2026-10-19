'use client';

import type { ReactElement, ReactNode } from 'react';
import { useNavigationState } from '../../lib/navigation';
import Skeleton from '../Skeleton';
import { SkeletonOverlay, skeletonFadeHost, useLeavingSkeleton } from '../SkeletonFade';

// The shell's body while a site-level navigation is on its way (M12.33): the
// page that was there gives way to one skeleton, in a `main` of its own so the
// page keeps its landmark during the wait (the pages draw their own `main`,
// which the skeleton replaces). Only a `main` target is answered here; a
// `coven` or `admin` target is `SectionBody`'s, and no target at all (a refresh) leaves the
// page standing. The page's own heading goes with it, so the wait carries a
// hidden one: a page without a level-one heading fails the accessibility scan.
// A client part, since the state is the browser's.
// claude-docs/components/app-shell.md
// The frame the destination sits in, so the wait is the page's width and
// place rather than the standard centred `.page-frame` (66ch, drawn down the
// window): the wide column for the wide pages and the menu pages, the forms'
// column for the narrow ones. The standard frame stays for a target that names
// none (the brand link's). A `skeleton-frame` is top-aligned, never centred.
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
  return (
    <div className={skeletonFadeHost(leaving !== null)}>
      {frame ? (
        <main className={className}>
          <h1 className="visually-hidden">Loading</h1>
          {frame}
        </main>
      ) : (
        children
      )}
      {leaving && <SkeletonOverlay>{leaving}</SkeletonOverlay>}
    </div>
  );
};

export default MainBody;
