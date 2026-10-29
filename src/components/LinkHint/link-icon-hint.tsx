'use client';

import type { ReactElement } from 'react';
import { LinkIcon } from '../IconTip';
import Spinner from '../Spinner';
import { useLinkPending } from './use-link-pending';
import './index.scss';

// The chain icon of a link that wears one, turning into the loading ring while pending, in one 1em
// box so nothing shifts. The stylesheet hides the icon only after `$loading-delay`, so a quick
// navigation changes nothing (claude-docs/components/link-hint.md).
export default function LinkIconHint(): ReactElement {
  const pending = useLinkPending();
  return (
    <span className={pending ? 'link-icon-hint is-pending' : 'link-icon-hint'}>
      <LinkIcon />
      {pending && <Spinner />}
    </span>
  );
}
