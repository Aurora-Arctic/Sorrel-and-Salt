'use client';

import type { Route } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { PendingLink } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import { useOpenModalClick } from '../Modal';
import type { RouteModalLink } from '../Modal/types';
import { DETAILS_PLACE } from './details';

/**
 * An ingredient's name in a list, opening its details modal over the list
 * (M12.5). Its `href` is the entry's page, so a new tab, a press before the
 * script loads, or a list with no modal provider reaches the page; a plain
 * press under a provider opens `opens` at once in the details place instead.
 * A client file of its own so the card and the table stay server components.
 */
export default function DetailsLink({
  href,
  opens,
  className,
  children,
}: {
  href: Route;
  opens: RouteModalLink;
  className?: string;
  children: ReactNode;
}): ReactElement {
  const onClick = useOpenModalClick(opens.href, opens.heading, DETAILS_PLACE);
  return (
    <PendingLink
      className={className}
      href={href}
      navigationTarget={ingredientLinkTarget(href)}
      onClick={onClick}
    >
      {children}
    </PendingLink>
  );
}
