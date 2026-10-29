'use client';

import type { ReactElement } from 'react';
import { LinkIcon } from '../IconTip';
import Spinner from '../Spinner';
import { useLinkPending } from './use-link-pending';
import './index.scss';

// The chain icon of a link that wears one, which turns into the loading ring while the link
// is pending: the link then needs no dot beside it. Both sit in one 1em box, so nothing
// shifts; the stylesheet hides the icon only once `$loading-delay` has passed, so a quick
// navigation changes nothing. Decorative, like the dot.
// claude-docs/components/link-hint.md
export default function LinkIconHint(): ReactElement {
  const pending = useLinkPending();
  return (
    <span className={pending ? 'link-icon-hint is-pending' : 'link-icon-hint'}>
      <LinkIcon />
      {pending && <Spinner />}
    </span>
  );
}
