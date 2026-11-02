'use client';

import type { ReactElement } from 'react';
import { ModalLink, useOpenModalClick } from '../Modal';
import type { MemberLinkProps } from './types';

/**
 * A row's name, opening the member's modal over the list (`?member=<id>`); still a link, so a new tab opens the
 * address. A client file so the list stays a server component (claude-docs/components/member-list.md, "The modal").
 */
const MemberLink = ({ href, heading, name }: MemberLinkProps): ReactElement => {
  const onClick = useOpenModalClick(href, heading);
  return (
    <ModalLink href={href} onClick={onClick}>
      {name}
    </ModalLink>
  );
};

export default MemberLink;
