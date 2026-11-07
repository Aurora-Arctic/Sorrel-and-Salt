'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import type { MouseEvent, ReactElement, ReactNode } from 'react';
import { PendingLink } from '../../lib/navigation';
import { listReturnHref } from './back-href';
import './back-link.scss';

interface BackLinkProps {
  href: Route;
  label: string;
  also?: readonly { path: string; label: string }[];
  className?: string;
  children?: ReactNode;
}

export function BackChevron(): ReactElement {
  return (
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
  );
}

function previousListHref(listPaths: readonly string[]): string | undefined {
  // An enhancement past the floor, behind the `in` check: without it the link stays bare.
  const navigation = 'navigation' in window ? window.navigation : undefined;
  const current = navigation?.currentEntry;
  if (!navigation || !current || current.index < 1) return undefined;
  const previous = navigation.entries()[current.index - 1];
  return listReturnHref(previous?.url, window.location.origin, listPaths);
}

/** Re-reads history when the entry changes: Next pushes its address only after drawing it. */
function subscribe(onChange: () => void): () => void {
  // An enhancement past the floor, behind the `in` check: without it nothing changes.
  const navigation = 'navigation' in window ? window.navigation : undefined;
  // Next writes the history inside an insertion effect, and the event fires from that write; React refuses an update scheduled there, so the notice waits a microtask.
  const notify = () => queueMicrotask(onChange);
  navigation?.addEventListener('currententrychange', notify);
  return () => navigation?.removeEventListener('currententrychange', notify);
}

/**
 * The "Back to …" link of an ingredient entry and a spell's recipe page, taking the previous list's
 * address from history (claude-docs/components/ingredient-entry.md, "The back link"). The Navigation
 * API is past the browser floor, so an enhancement only: without it the link stays the bare list.
 */
export default function BackLink({
  href,
  label,
  also = [],
  className,
  children,
}: BackLinkProps): ReactElement {
  const router = useRouter();
  const listPaths = [href.split(/[?#]/)[0] ?? href, ...also.map(({ path }) => path)];
  const historyHref = useSyncExternalStore(
    subscribe,
    () => previousListHref(listPaths),
    () => undefined,
  );

  // The server and the hydrating render say the list the page names; the browser then says the one it returns to.
  const historyPath = historyHref?.split(/[?#]/)[0];
  const shownLabel = also.find(({ path }) => path === historyPath)?.label ?? label;

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
      onClick={goBack}
    >
      <BackChevron />
      Back to {shownLabel}
      {children && <> {children}</>}
    </PendingLink>
  );
}
