'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type MouseEvent, type ReactElement, useEffect, useState, useTransition } from 'react';
import PagerEndContent from './end-content';
import type { PagerLinkProps } from './types';

// The ends that lead somewhere, each showing its own page is on the way: the
// spinner in its chevron's place and `aria-busy`, only on the end followed.
// Two components rather than one, so only the soft end asks for the App
// Router, which a plain end's owner may not mount (claude-docs/components/pager.md).

/** A click the browser takes elsewhere — a new tab or window — leaving this page as it is. */
function opensElsewhere(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

/** A soft end: the page pushed inside a transition, which stays pending until it renders. */
export const SoftPagerLink = ({ href, label }: PagerLinkProps): ReactElement => {
  const router = useRouter();
  const [pushing, startPushing] = useTransition();

  function follow(event: MouseEvent<HTMLAnchorElement>) {
    if (opensElsewhere(event)) return;
    event.preventDefault();
    if (pushing) return;
    startPushing(() => {
      router.push(href as Route);
    });
  }

  return (
    <Link
      className="btn btn--quiet"
      href={href as Route}
      onClick={follow}
      aria-busy={pushing || undefined}
    >
      <PagerEndContent label={label} busy={pushing} />
    </Link>
  );
};

/**
 * A plain end: busy from the click until the browser leaves the page. Back
 * may restore the page from the cache as it was left, so a `pageshow` from
 * the cache clears it.
 */
export const PlainPagerLink = ({ href, label }: PagerLinkProps): ReactElement => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) setLoading(false);
    };
    window.addEventListener('pageshow', restored);
    return () => window.removeEventListener('pageshow', restored);
  }, []);

  return (
    <a
      className="btn btn--quiet"
      href={href}
      onClick={(event) => {
        if (!opensElsewhere(event)) setLoading(true);
      }}
      aria-busy={loading || undefined}
    >
      <PagerEndContent label={label} busy={loading} />
    </a>
  );
};
