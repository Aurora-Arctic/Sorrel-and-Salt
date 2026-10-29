'use client';

import Link from 'next/link';
import type { ComponentProps, MouseEvent, ReactElement } from 'react';
import type { NavigationTarget } from './types';
import { opensElsewhere } from '../opens-elsewhere';
import { LinkPendingContext } from './link-pending';
import { usePendingNavigation } from './use-navigation';

// `navigationTarget`, not `target`: an anchor's own `target="_blank"` keeps its name.
type PendingLinkProps = ComponentProps<typeof Link> & { navigationTarget?: NavigationTarget };

/**
 * The one link the site draws. A plain press navigates through the shared hook, so the page bar and the destination's skeleton follow; a press meant for a
 * new tab or window, or a link that opens elsewhere, is left to the browser.
 */
export function PendingLink({
  navigationTarget,
  onClick,
  href,
  replace,
  scroll,
  target,
  ...rest
}: PendingLinkProps): ReactElement {
  const { navigate, pending } = usePendingNavigation();
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || typeof href !== 'string') return;
    if (opensElsewhere(event)) return;
    if ((target && target !== '_self') || rest.download !== undefined) return;
    event.preventDefault();
    navigate(href, {
      replace: replace === true,
      ...(scroll === undefined ? {} : { scroll }),
      ...(navigationTarget ? { target: navigationTarget } : {}),
    });
  };
  return (
    <Link
      {...rest}
      href={href}
      replace={replace}
      scroll={scroll}
      target={target}
      aria-busy={pending || undefined}
      onClick={handleClick}
    >
      <LinkPendingContext value={pending}>{rest.children}</LinkPendingContext>
    </Link>
  );
}
