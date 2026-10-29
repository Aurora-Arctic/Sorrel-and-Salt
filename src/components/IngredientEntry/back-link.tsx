'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import type { MouseEvent, ReactElement, ReactNode } from 'react';
import { PendingLink } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import { listReturnHref } from './back-href';
import './back-link.scss';

interface BackLinkProps {
  /** The bare list, `/compendium`, this coven's `/coven/<slug>/ingredients` or its `/grimoire`. */
  href: Route;
  /** Other paths that are the same list: the grimoire's Drafts tab beside its Spells tab. */
  also?: readonly string[];
  className?: string;
  children: ReactNode;
}

/** The page before this one, when it is one of `listPaths` itself: its path and query. */
function previousListHref(listPaths: readonly string[]): string | undefined {
  // An enhancement past the floor, behind the `in` check: without it the link stays bare.
  const navigation = 'navigation' in window ? window.navigation : undefined;
  const current = navigation?.currentEntry;
  if (!navigation || !current || current.index < 1) return undefined;
  const previous = navigation.entries()[current.index - 1];
  return listReturnHref(previous?.url, window.location.origin, listPaths);
}

/**
 * Reads the history again whenever the current entry changes. Next pushes the entry's address
 * only after drawing it, so on a move from the list the first read still sees the list as the
 * current page.
 */
function subscribe(onChange: () => void): () => void {
  // An enhancement past the floor, behind the `in` check: without it nothing changes.
  const navigation = 'navigation' in window ? window.navigation : undefined;
  navigation?.addEventListener('currententrychange', onChange);
  return () => navigation?.removeEventListener('currententrychange', onChange);
}

/**
 * The "Back to …" link of an ingredient entry (MB.271) and of a spell's recipe page (M13.21),
 * a left chevron before its words. The server draws it as the bare list. Once the page is
 * in the browser, when the page before this one in the tab's history is that same list with a
 * search, filters or a page, the link takes that address, and a plain press goes back through
 * history rather than loading the list afresh, so the list returns where it was scrolled to.
 * A press meant for a new tab or window follows the address.
 *
 * The history is read through the Navigation API, which is past the browser floor (Baseline
 * newly available since 2026-01): an enhancement only. Without it the link stays the bare list,
 * as it does when the entry is opened directly. `history` has no way to read an earlier entry's
 * address, and the list's address is not passed along in the entry's own (no `?from=`), so a
 * crafted address can never point the link elsewhere.
 */
export default function BackLink({
  href,
  also = [],
  className,
  children,
}: BackLinkProps): ReactElement {
  const router = useRouter();
  const listPaths = [href.split(/[?#]/)[0] ?? href, ...also];
  // The server, and the first render in the browser, draw the bare list: the server cannot see
  // the tab's history, and the hydrating render must match it. React then reads the history.
  const historyHref = useSyncExternalStore(
    subscribe,
    () => previousListHref(listPaths),
    () => undefined,
  );

  const goBack = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!historyHref) return;
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    // Back through history, where Next keeps the list's scroll position; loading the address
    // afresh would open the list at its top.
    event.preventDefault();
    router.back();
  };

  return (
    <PendingLink
      className={className ? `back-link ${className}` : 'back-link'}
      href={(historyHref ?? href) as Route}
      navigationTarget={ingredientLinkTarget(href)}
      onClick={goBack}
    >
      <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
        <path
          d="M10 3.5L5.5 8l4.5 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {children}
    </PendingLink>
  );
}
