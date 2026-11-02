'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, type ReactElement } from 'react';
import { SUPPORT_PARAM, SUPPORT_PATH, supportHref } from '../../lib/support-path';
import type { SupportLinkProps } from './types';

// A link that opens the Support dialog over the page it is on. Before the address is known it goes to the
// support page instead (claude-docs/components/support-link.md).

function Opening({ children, about, ...rest }: SupportLinkProps): ReactElement {
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <Link {...rest} href={supportHref(pathname, new URLSearchParams(params), about) as Route}>
      {children}
    </Link>
  );
}

const SupportLink = ({ children, about, ...rest }: SupportLinkProps): ReactElement => {
  const fallback = (
    <Link {...rest} href={about ? `${SUPPORT_PATH}?${SUPPORT_PARAM}=${about}` : SUPPORT_PATH}>
      {children}
    </Link>
  );
  return (
    <Suspense fallback={fallback}>
      <Opening about={about} {...rest}>
        {children}
      </Opening>
    </Suspense>
  );
};

export default SupportLink;
