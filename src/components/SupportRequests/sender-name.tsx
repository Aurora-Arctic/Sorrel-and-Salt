'use client';

import type { Route } from 'next';
import type { ReactElement } from 'react';
import { ModalLink, useOpenModalClick } from '../Modal';
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
  /** A signed-out visitor has no account of their own to open, so they are named by that and nothing more. */
  signedOut?: boolean;
  /** The address that opens a user's modal here; none for a curator. */
  userHref?: (id: string) => Route;
}): ReactElement => {
  const href = sender && userHref ? userHref(sender.id) : undefined;
  const onClick = useOpenModalClick(
    href ?? '/keepers/support',
    { title: sender?.name ?? '' },
    USER_MODAL_PLACE,
  );
  if (signedOut) return <>Signed-out sender</>;
  if (!sender) return <>Deleted account</>;
  if (!href) return <>{sender.name}</>;
  return (
    <ModalLink href={href} onClick={onClick}>
      {sender.name}
    </ModalLink>
  );
};

export default SenderName;
