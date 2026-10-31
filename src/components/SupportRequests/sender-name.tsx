import Link from 'next/link';
import type { ReactElement } from 'react';
import { userListHref } from '../UserList/href';
import type { SupportSender } from './types';

/**
 * The sender's name; for an admin a link that opens the sender's user modal on the Users list, which a curator
 * cannot reach, so theirs stays text. A deleted account has no one to open.
 */
const SenderName = ({
  sender,
  isAdmin,
}: {
  sender: SupportSender | null;
  isAdmin: boolean;
}): ReactElement => {
  if (!sender) return <>Deleted account</>;
  if (!isAdmin) return <>{sender.name}</>;
  return (
    <Link href={userListHref({ query: '', awaitingApproval: false }, undefined, sender.id)}>
      {sender.name}
    </Link>
  );
};

export default SenderName;
