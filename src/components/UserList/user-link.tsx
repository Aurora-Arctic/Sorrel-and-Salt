'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { useOpenModalClick } from '../Modal';
import type { UserLinkProps } from './types';

/**
 * A row's name, opening the user's modal over the list, `?user=<id>`
 *. A press opens it at once under `heading`, the user's covens
 * arriving with the navigation; a link still, so a new tab, or a
 * press before the script loads, opens the address. A client file of its
 * own so the list stays a server component.
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
