'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { useOpenModalClick } from '../Modal';
import type { UserLinkProps } from './types';

/**
 * A row's name, opening the user's modal over the list (`?user=<id>`); still a link, so a new tab opens the address. A client file so the list stays a server component.
 * (claude-docs/components/user-list.md, "The user link and the filter").
 */
const UserLink = ({ href, heading, name }: UserLinkProps): ReactElement => {
  const onClick = useOpenModalClick(href, heading);
  return (
    <Link href={href} onClick={onClick}>
      {name}
    </Link>
  );
};

export default UserLink;
