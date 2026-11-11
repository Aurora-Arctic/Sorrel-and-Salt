'use client';

import type { Route } from 'next';
import type { ReactElement } from 'react';
import { OpenModalLink } from '../Modal';
import { DELETED_ACCOUNT, SIGNED_OUT_SENDER } from './labels';
import { USER_MODAL_PLACE } from './href';
import type { SupportSender } from './types';

/**
 * The sender's name; for a keeper a link that opens the sender's user modal over this page, which a curator
 * cannot reach, so theirs stays text. A deleted account has no one to open.
 */
const SenderName = ({
  sender,
  signedOut = false,
  userHref,
}: {
  sender: SupportSender | null;
  signedOut?: boolean;
  userHref?: (id: string) => Route;
}): ReactElement => {
  const href = sender && userHref ? userHref(sender.id) : undefined;
  if (signedOut) return <>{SIGNED_OUT_SENDER}</>;
  if (!sender) return <>{DELETED_ACCOUNT}</>;
  if (!href) return <>{sender.name}</>;
  return (
    <OpenModalLink href={href} heading={{ title: sender.name }} place={USER_MODAL_PLACE}>
      {sender.name}
    </OpenModalLink>
  );
};

export default SenderName;
