'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, type ReactElement } from 'react';
import { SUPPORT_PATH, supportHref } from '../../lib/support-path';
import type { SupportLinkProps } from './types';

// A link that opens the Support dialog over the page it is on. Before the address is known, and
// where no dialog is drawn (`plain`), it goes to the support page instead
// (claude-docs/components/support-link.md).

function Opening({ children, ...rest }: SupportLinkProps): ReactElement {
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <Link
      {...rest}
      href={supportHref(pathname, new URLSearchParams(params), 'accessibility') as Route}
    >
      {children}
    </Link>
  );
}

const SupportLink = ({ plain = false, children, ...rest }: SupportLinkProps): ReactElement => {
  const fallback = (
    <Link {...rest} href={SUPPORT_PATH}>
      {children}
    </Link>
  );
  if (plain) return fallback;
  return (
    <Suspense fallback={fallback}>
      <Opening {...rest}>{children}</Opening>
    </Suspense>
  );
};

export default SupportLink;
