'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import {
  type ReactElement,
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
} from 'react';
import TabPanelLoading from '../TabbedPage/panel-loading';
import type { ListBodyProps, ListFrameProps, ListNavigation } from './types';

// A list page's root, `.list-frame`, and the one record of whether another
// of its pages is on its way (MB.115, the owner's call: "Filters should
// trigger the same type of loading state as tabs"). Filter, Clear and
// the pager's ends each navigate through it, so while the new page reads the
// filter row greys out and the list beneath it, table and pager, is the
// tabs' own skeleton; the new list fades in as a tab's content does. A
// direct request renders on the server as before, with no skeleton
// (claude-docs/components/list-frame.md).

/**
 * Whether a page of the list is on its way, and the way to open one.
 * Exported for the workshop, whose stub router goes nowhere, to draw a list
 * on its way.
 */
export const ListNavigationContext = createContext<ListNavigation | null>(null);

/**
 * Holds the navigation the filter, the pager and the body share. A soft
 * navigation runs inside this transition, so `pending` stays true until Next
 * has rendered the new page. A full load has no transition to wait on: a
 * flag holds `pending` from the press until the browser unloads the page,
 * the old page staying on screen until the new one's first paint, and a
 * `pageshow` from the back-forward cache drops it, so Back does not land on
 * a skeleton. A provider already above, the workshop's, is kept rather than
 * shadowed.
 */
const ListFrame = ({ className, children }: ListFrameProps): ReactElement => {
  const outer = useContext(ListNavigationContext);
  const router = useRouter();
  const [moving, startMoving] = useTransition();
  const [leaving, setLeaving] = useState(false);
  const pending = moving || leaving;

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
    go: (href, kind) => {
      if (pending) return;
      if (kind === 'full') {
        setLeaving(true);
        window.location.assign(href);
        return;
      }
      startMoving(() => router.push(href as Route));
    },
  };
  return (
    <ListNavigationContext.Provider value={value}>
      <div className={className ? `list-frame ${className}` : 'list-frame'}>{children}</div>
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
 * a pager, no filter row, since the real one stays. Keyed by which it shows,
 * so each mounts afresh and fades in, as a tab's panel does; a list drawn by
 * the server, before any press, is shown at once.
 */
export const ListBody = ({ children }: ListBodyProps): ReactElement => {
  const { pending } = useListNavigation();
  const [moved, setMoved] = useState(false);
  if (pending && !moved) setMoved(true);
  return pending ? (
    <div key="loading" className="list-frame__body">
      <TabPanelLoading />
    </div>
  ) : (
    <div key="content" className="list-frame__body" data-arrived={moved || undefined}>
      {children}
    </div>
  );
};

export default ListFrame;
