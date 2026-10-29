'use client';

import { type ReactElement, createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePendingNavigation } from '../../lib/navigation';
import SwapPanel from '../Skeleton/swap-panel';
import type { ListBodyProps, ListFrameProps, ListNavigation, ListNavigationKind } from './types';

// A list page's root, `.list-frame`, and the one record of whether another of its pages is
// on its way. The filter, as it applies, and the pager's ends each navigate through it, so
// while the new page reads, the filter row greys out and the list beneath it is the tabs'
// own skeleton; the new list fades in as a tab's content does. A direct request renders on
// the server with no skeleton (claude-docs/components/list-frame.md).

/**
 * Whether a page of the list is on its way, and the way to open one.
 * Exported for the workshop, whose stub router goes nowhere, to draw a list
 * on its way.
 */
export const ListNavigationContext = createContext<ListNavigation | null>(null);

/**
 * Holds the navigation the filter, pager and body share; `pending` stays true until Next has rendered the new page
 * (claude-docs/components/list-frame.md, "The navigation provider").
 */
const ListFrame = ({ className, children }: ListFrameProps): ReactElement => {
  const outer = useContext(ListNavigationContext);
  const { pending: moving, navigate } = usePendingNavigation();
  const [leaving, setLeaving] = useState(false);
  const pending = moving || leaving;
  const root = useRef<HTMLDivElement>(null);
  const keepPlace = useRef(false);
  const [heldHeight, setHeldHeight] = useState<number>();
  // The kind of the navigation last started; read only while one is pending.
  const [kind, setKind] = useState<ListNavigationKind>();
  // The address of the navigation last started, read only while one is pending.
  const [target, setTarget] = useState<string>();

  // A pager end's page: once the transition ends the new page has rendered, so bring the
  // start of the list to the line the stuck search row leaves, if it is above that now. A
  // plain `scrollIntoView`, so the site's smooth scroll and reduced-motion rule apply.
  useEffect(() => {
    if (moving) return;
    // oxlint-disable-next-line react/set-state-in-effect -- the state follows an outside value (a timer, a measurement or a focus request), so it can only be set from an effect
    setHeldHeight(undefined);
    if (!keepPlace.current) return;
    keepPlace.current = false;
    const body = root.current?.querySelector('.list-frame__body');
    if (!body) return;
    const line = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    if (body.getBoundingClientRect().top < line) body.scrollIntoView({ block: 'start' });
  }, [moving]);

  useEffect(() => {
    if (!leaving) return;
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) setLeaving(false);
    };
    window.addEventListener('pageshow', restored);
    return () => window.removeEventListener('pageshow', restored);
  }, [leaving]);

  const value: ListNavigation = outer ?? {
    pending,
    // A filter's navigation is always soft; a pager end's is `page` or `full`.
    searching: pending && kind === 'soft',
    target: pending ? target : undefined,
    heldHeight,
    go: (href, way) => {
      if (pending) return;
      setKind(way);
      setTarget(href);
      if (way === 'full') {
        setLeaving(true);
        window.location.assign(href);
        return;
      }
      // A pager end keeps the reader at the list rather than Next's scroll to
      // the page top, which would bring the admin section menu back into view.
      keepPlace.current = way === 'page';
      // The skeleton is far shorter than a page of cards, and a shorter document makes the
      // browser pull the scroll position up. So the body keeps the height it had at the press
      // while the page is on its way; the new page renders without it, so a short last page
      // is not padded.
      setHeldHeight(
        way === 'page'
          ? root.current?.querySelector('.list-frame__body')?.getBoundingClientRect().height
          : undefined,
      );
      navigate(href, way === 'page' ? { scroll: false } : undefined);
    },
  };
  return (
    <ListNavigationContext.Provider value={value}>
      <div ref={root} className={className ? `list-frame ${className}` : 'list-frame'}>
        {children}
      </div>
    </ListNavigationContext.Provider>
  );
};

export function useListNavigation(): ListNavigation {
  const value = useContext(ListNavigationContext);
  if (!value) throw new Error('A list filter or pager renders inside ListFrame.');
  return value;
}

/**
 * The list under its filter, the table or its empty state and the pager, or
 * the tabs' skeleton in its place while another page is on its way: rows and
 * a pager, no filter row, since the real one stays. Swapped as a tab's
 * panel is (`Skeleton/swap-panel.tsx`).
 */
export const ListBody = ({ shape, children }: ListBodyProps): ReactElement => {
  const { pending, heldHeight } = useListNavigation();
  return (
    <SwapPanel
      pending={pending}
      className="list-frame__body"
      shape={shape}
      loadingMinHeight={heldHeight}
    >
      {children}
    </SwapPanel>
  );
};

export default ListFrame;
