'use client';

import {
  type ReactElement,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { usePendingNavigation, reportLeaving } from '../../lib/navigation';
import { useRestoredFromCache } from '../../lib/use-restored-from-cache';
import SwapPanel from '../Skeleton/swap-panel';
import type { ListBodyProps, ListFrameProps, ListNavigation, ListNavigationKind } from './types';

// A list page's root, `.list-frame`, and the record of whether another of its pages is coming. The
// filter and pager ends navigate through it, so the row greys out and the list shows the tabs'
// skeleton; a direct request has none (claude-docs/components/list-frame.md).

export const ListNavigationContext = createContext<ListNavigation | null>(null);

/**
 * Holds the navigation the filter, pager and body share; `pending` stays true until Next has rendered the new page
 * (claude-docs/components/list-frame.md, "Contracts").
 */
const ListFrame = ({ className, disabled = false, children }: ListFrameProps): ReactElement => {
  const outer = useContext(ListNavigationContext);
  const { pending: moving, navigate } = usePendingNavigation();
  const [leaving, setLeaving] = useState(false);
  const pending = moving || leaving;
  const root = useRef<HTMLDivElement>(null);
  const keepPlace = useRef(false);
  const [heldHeight, setHeldHeight] = useState<number>();
  const [kind, setKind] = useState<ListNavigationKind>();
  const [target, setTarget] = useState<string>();

  // A list drawn as a placeholder: its real controls are disabled and the links taken out of the
  // tab order, since the page they belong to has not arrived.
  useLayoutEffect(() => {
    if (!disabled) return;
    for (const control of root.current?.querySelectorAll<HTMLElement>(
      'input, select, textarea, button, a[href]',
    ) ?? []) {
      if (control instanceof HTMLAnchorElement) {
        control.tabIndex = -1;
        control.setAttribute('aria-disabled', 'true');
      } else (control as HTMLInputElement).disabled = true;
    }
  }, [disabled]);

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

  useRestoredFromCache(() => setLeaving(false), leaving);

  const value: ListNavigation = outer ?? {
    pending,
    searching: pending && kind === 'soft',
    target: pending ? target : undefined,
    heldHeight,
    go: (href, way) => {
      if (pending) return;
      setKind(way);
      setTarget(href);
      if (way === 'full') {
        setLeaving(true);
        reportLeaving();
        window.location.assign(href);
        return;
      }
      // A pager end keeps the reader at the list rather than Next's scroll to
      // the page top, which would bring the admin section menu back into view.
      keepPlace.current = way === 'page';
      // The skeleton is far shorter than a page of cards, which would make the browser pull the scroll position up, so the
      // body keeps the height it had at the press while the page is on its way. The new page renders without it.
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
      <div
        ref={root}
        className={className ? `list-frame ${className}` : 'list-frame'}
        aria-hidden={disabled || undefined}
      >
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
 * The list under its filter, or the tabs' skeleton in its place while another page is on its way (rows and a pager, no
 * filter row, since the real one stays). Swapped as a tab's panel is (`Skeleton/swap-panel.tsx`).
 */
export const ListBody = ({ skeleton, children }: ListBodyProps): ReactElement => {
  const { pending, heldHeight } = useListNavigation();
  return (
    <SwapPanel
      pending={pending}
      className="list-frame__body"
      skeleton={skeleton}
      loadingMinHeight={heldHeight}
    >
      {children}
    </SwapPanel>
  );
};

export default ListFrame;
