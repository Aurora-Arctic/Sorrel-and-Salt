'use client';

import type { Route } from 'next';
import type { ReactElement } from 'react';
import { ModalLink, useOpenModalClick } from '../Modal';
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
  const onClick = useOpenModalClick(
    href ?? '/keepers/support',
    { title: sender?.name ?? '' },
    USER_MODAL_PLACE,
  );
  if (signedOut) return <>{SIGNED_OUT_SENDER}</>;
  if (!sender) return <>{DELETED_ACCOUNT}</>;
  if (!href) return <>{sender.name}</>;
  return (
    <ModalLink href={href} onClick={onClick}>
      {sender.name}
    </ModalLink>
  );
};

export default SenderName;
