'use client';

import { useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { ARRIVE_MS } from '../../lib/navigation/timing';
import './index.scss';

// The skeleton's way out: when a wait ends, the bodies (`MainBody`,
// `SectionBody`) do not drop the skeleton at once but keep the last one over
// the page that has arrived, and it fades away while the page shows through.
// A client part, since the timer is the browser's. A fade rather than the
// page fading in, since wrapping the arriving page would put a box round it
// that the section layouts' flex columns would feel; the overlay is out of
// layout and unmounts when it has gone.
// claude-docs/components/skeleton-fade.md

/**
 * The skeleton to keep over the page for the length of its fade-out, or null.
 * Pass the skeleton while a wait is on and null when it is not. A wait that
 * showed no skeleton (a refresh) leaves nothing to fade, and a new wait
 * starting mid-fade takes it back at once.
 */
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

/** The host's class: the box the overlay is placed against, clipped while it fades. */
export const skeletonFadeHost = (leaving: boolean): string =>
  leaving ? 'skeleton-fade-host skeleton-fade-host--fading' : 'skeleton-fade-host';

/**
 * The props that hold the page during a wait: the page stays mounted at
 * its full height, unseen (`visibility`, which keeps its box, where
 * `display: none` or React's `<Activity>` would collapse it) and out of reach
 * (`inert`, `aria-hidden`), while `SkeletonCover` stands over it. Not taken
 * away, because the browser saves the scroll position into the history entry
 * when the navigation writes it, after the skeleton is up: a page swapped for a
 * shorter skeleton clamps the scroll first, and Back returns to the clamped one.
 * The same element whether waiting or not, so React keeps the page mounted.
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

/**
 * The skeleton kept over the arrived page, out of layout and out of the
 * accessibility tree (the page carries the one heading and landmark now).
 */
export const SkeletonOverlay = ({ children }: { children: ReactNode }): ReactElement => (
  <div className="skeleton-fade" aria-hidden="true">
    {children}
  </div>
);
