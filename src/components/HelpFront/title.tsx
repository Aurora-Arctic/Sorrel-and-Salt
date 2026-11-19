'use client';

import { usePathname } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';
import { isHelpFront } from '../../lib/help-paths';
import { useNavigationState } from '../../lib/navigation';
import { isPublicHelp } from '../../lib/navigation/staff-help';
import PageHeader from '../PageHeader';

const pathOf = (href: string): string => href.split(/[?#]/)[0] ?? href;

// The word Help at the head of every public help page. It is the page's heading on the front page and the search page; on
// every other page the page's own title is the heading, and Help above it is a label. The header stays mounted between
// pages, so it follows the address a move is headed for, as the skeleton beneath it does (claude-docs/components/help-front.md).
export function HelpFrontTitle({
  action,
  asLabel,
}: {
  action?: ReactNode;
  asLabel?: boolean;
}): ReactElement {
  const pathname = usePathname();
  const { busy, href } = useNavigationState();
  const heading =
    busy && href !== undefined && isPublicHelp(pathOf(href)) ? pathOf(href) : pathname;
  const label = asLabel ?? !isHelpFront(heading);
  return (
    <PageHeader
      title="Help"
      level={label ? 'span' : 'h1'}
      headingClassName={label ? 'help-front__label' : undefined}
      action={action}
    />
  );
}
