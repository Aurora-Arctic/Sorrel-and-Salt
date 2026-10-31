'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';
import {
  SUPPORT_ERROR_PARAM,
  SUPPORT_FROM_PARAM,
  SUPPORT_PARAM,
  SUPPORT_PATH,
} from '../../lib/support-path';
import type { ReportThisProps } from './types';

// The error pages' way to report what they show: a bug request with the status and the page filled in
// (claude-docs/components/report-this.md). In the shell it opens the Support dialog over the page; with
// no shell round it, it goes to `/support`, which takes the page as `from`.

const ReportThis = ({ code, inShell = false }: ReportThisProps): ReactElement => {
  const pathname = usePathname();
  const params = new URLSearchParams({
    [SUPPORT_PARAM]: 'bug',
    [SUPPORT_ERROR_PARAM]: String(code),
  });
  let href: string;
  if (inShell && pathname) {
    href = `${pathname}?${params}`;
  } else {
    if (pathname) params.set(SUPPORT_FROM_PARAM, pathname);
    href = `${SUPPORT_PATH}?${params}`;
  }
  return (
    <Link className="btn btn--quiet" href={href as Route}>
      Report This
    </Link>
  );
};

export default ReportThis;
