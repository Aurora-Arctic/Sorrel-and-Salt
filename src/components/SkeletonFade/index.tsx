'use client';

import { useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { ARRIVE_MS } from '../../lib/navigation/timing';
import './index.scss';

// The skeleton's way out: the bodies keep the last skeleton over the arrived page and fade it away, as an out-of-layout overlay, not by wrapping the page
// (claude-docs/components/skeleton.md).
// (claude-docs/components/skeleton.md, "Skeleton fade").

/** Pass null when no wait is on; a new wait mid-fade takes the kept skeleton back at once. */
export function useLeavingSkeleton(shown: ReactElement | null): ReactElement | null {
  const [kept, setKept] = useState<ReactElement | null>(null);
  const [wasShown, setWasShown] = useState(false);
  const [leaving, setLeaving] = useState<ReactElement | null>(null);
  const isShown = shown !== null;

  // Set while rendering, so the first frame after the wait already has the
  // overlay and the page never shows bare for a frame.
  if (isShown !== wasShown) {
    setWasShown(isShown);
    if (isShown) setKept(shown);
    setLeaving(isShown ? null : kept);
  }

  useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(() => setLeaving(null), ARRIVE_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  return leaving;
}

export const skeletonFadeHost = (leaving: boolean): string =>
  leaving ? 'skeleton-fade-host skeleton-fade-host--fading' : 'skeleton-fade-host';

/** The class of the box holding the page and its cover: while waiting, both share one grid cell, so the box is as tall as the taller. */
export const skeletonCoverHost = (waiting: boolean): string =>
  waiting ? 'skeleton-cover-host skeleton-cover-host--waiting' : 'skeleton-cover-host';

/**
 * The props holding the page during a wait: mounted at full height, unseen (`visibility`, not `display: none`) and `inert`, because Back needs the scroll position kept
 * (claude-docs/components/skeleton.md, "Skeleton fade").
 */
export const heldPage = (waiting: boolean, className?: string) => ({
  className: [className, waiting && 'skeleton-held'].filter(Boolean).join(' ') || undefined,
  inert: waiting || undefined,
  'aria-hidden': waiting || undefined,
});

/**
 * The waiting skeleton over the held page: laid over its whole height and
 * pinned under the bar, so it is in the window wherever the page was scrolled
 * to. `className` is the frame the skeleton stands in.
 */
export const SkeletonCover = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}): ReactElement => (
  <div className="skeleton-cover">
    <div className={className ? `skeleton-cover__pin ${className}` : 'skeleton-cover__pin'}>
      {children}
    </div>
  </div>
);

/** Out of layout and the accessibility tree: the page carries the heading and landmark now. */
export const SkeletonOverlay = ({ children }: { children: ReactNode }): ReactElement => (
  <div className="skeleton-fade" aria-hidden="true">
    {children}
  </div>
);
