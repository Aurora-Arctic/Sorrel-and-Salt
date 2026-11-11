'use client';

import type { Route } from 'next';
import type { ReactElement, ReactNode } from 'react';
import ModalLink from './modal-link';
import { useOpenModalClick } from './route-modal-provider';
import type { ModalHeading } from './types';

/**
 * A link whose press opens the address as a modal over the page, with its heading at once; still a link, so a
 * modified click or a new tab opens the address. A client file so a server-rendered list can use it.
 */
const OpenModalLink = ({
  href,
  heading,
  place,
  className,
  children,
}: {
  href: Route;
  heading: ModalHeading;
  place?: string;
  className?: string;
  children: ReactNode;
}): ReactElement => {
  const onClick = useOpenModalClick(href, heading, place);
  return (
    <ModalLink className={className} href={href} onClick={onClick}>
      {children}
    </ModalLink>
  );
};

export default OpenModalLink;
