'use client';

import type { Route } from 'next';
import Link from 'next/link';
import type { MouseEvent, ReactElement } from 'react';
import { opensElsewhere } from '../../lib/opens-elsewhere';
import { useListNavigation } from '../ListFrame';
import PagerEndContent from './end-content';
import type { PagerLinkProps } from './types';

// An end that leads somewhere. A plain left click goes through the list's `ListFrame` skeleton; a
// soft end is `next/link` (prefetched), a plain end a bare anchor. A modified or middle click is
// the browser's (claude-docs/components/pager.md).
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
