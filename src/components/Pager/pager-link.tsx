'use client';

import type { Route } from 'next';
import Link from 'next/link';
import type { MouseEvent, ReactElement } from 'react';
import { opensElsewhere } from '../../lib/opens-elsewhere';
import { useListNavigation } from '../ListFrame';
import PagerEndContent from './end-content';
import type { PagerLinkProps } from './types';

// An end that leads somewhere. A plain left click opens its page through the list's
// `ListFrame`, which puts the tabs' skeleton in place of the list, this pager included, until
// the page renders or the browser leaves, as a filter does. A soft end is `next/link`, so
// Next prefetches its page; a plain end a bare anchor, its page a full load. A modified or
// middle click is the browser's, a new tab or window (claude-docs/components/pager.md).
const PagerLink = ({ href, label, soft }: PagerLinkProps): ReactElement => {
  const { go } = useListNavigation();

  function follow(event: MouseEvent<HTMLAnchorElement>) {
    if (opensElsewhere(event)) return;
    event.preventDefault();
    go(href, soft ? 'page' : 'full');
  }

  const content = <PagerEndContent label={label} />;
  return soft ? (
    <Link className="btn btn--quiet" href={href as Route} onClick={follow}>
      {content}
    </Link>
  ) : (
    <a className="btn btn--quiet" href={href} onClick={follow}>
      {content}
    </a>
  );
};

export default PagerLink;
