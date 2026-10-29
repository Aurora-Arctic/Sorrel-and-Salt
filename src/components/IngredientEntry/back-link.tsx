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

/** Reads the history again whenever the current entry changes, as Next pushes the entry's address only after drawing it. */
function subscribe(onChange: () => void): () => void {
  // An enhancement past the floor, behind the `in` check: without it nothing changes.
  const navigation = 'navigation' in window ? window.navigation : undefined;
  navigation?.addEventListener('currententrychange', onChange);
  return () => navigation?.removeEventListener('currententrychange', onChange);
}

/**
 * The "Back to …" link of an ingredient entry and a spell's recipe page, taking the previous list's
 * address from history (claude-docs/components/ingredient-entry.md, "Component notes"). The Navigation
 * API is past the browser floor, so an enhancement only: without it the link stays the bare list.
 */
export default function BackLink({
  href,
  also = [],
  className,
  children,
}: BackLinkProps): ReactElement {
  const router = useRouter();
  const listPaths = [href.split(/[?#]/)[0] ?? href, ...also];
  // The server and the hydrating render draw the bare list; React then reads the history.
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
