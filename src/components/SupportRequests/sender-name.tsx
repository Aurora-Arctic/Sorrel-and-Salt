'use client';

import type { Route } from 'next';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useOpenModalClick } from '../Modal';
import { USER_MODAL_PLACE } from './href';
import type { SupportSender } from './types';

/**
 * The sender's name; for an admin a link that opens the sender's user modal over this page, which a curator
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
    href ?? '/admin/support',
    { title: sender?.name ?? '' },
    USER_MODAL_PLACE,
  );
  if (signedOut) return <>Signed-out sender</>;
  if (!sender) return <>Deleted account</>;
  if (!href) return <>{sender.name}</>;
  return (
    <Link href={href} onClick={onClick}>
      {sender.name}
    </Link>
  );
};

export default SenderName;
