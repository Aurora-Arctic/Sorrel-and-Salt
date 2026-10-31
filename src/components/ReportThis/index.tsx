'use client';

import type { Route } from 'next';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useActualPathname } from '../../lib/use-actual-pathname';
import {
  SUPPORT_ERROR_PARAM,
  SUPPORT_FROM_PARAM,
  SUPPORT_PARAM,
  SUPPORT_PATH,
  SUPPORT_REF_PARAM,
} from '../../lib/support-path';
import IconTip from '../IconTip/icon-tip';
import { SupportIcon } from '../IconTip/icons';
import type { ReportThisProps } from './types';

// The error pages' way to report what they show: a bug request with the status and the page filled in
// (claude-docs/components/report-this.md). In the shell it opens the Support dialog over the page; with
// no shell round it, it goes to `/support`, which takes the page as `from`.

const ReportThis = ({ code, reference, inShell = false }: ReportThisProps): ReactElement => {
  const pathname = useActualPathname();
  const params = new URLSearchParams({
    [SUPPORT_PARAM]: 'bug',
    [SUPPORT_ERROR_PARAM]: String(code),
  });
  if (reference) params.set(SUPPORT_REF_PARAM, reference);
  let href: string;
  if (inShell) {
    // With no path to name, a query on its own keeps the address the browser is at.
    href = `${pathname ?? ''}?${params}`;
  } else {
    if (pathname) params.set(SUPPORT_FROM_PARAM, pathname);
    href = `${SUPPORT_PATH}?${params}`;
  }
  return (
    <IconTip tip="Report This">
      <Link className="btn btn--quiet btn--icon" href={href as Route}>
        <SupportIcon />
        <span className="visually-hidden">Report This</span>
      </Link>
    </IconTip>
  );
};

export default ReportThis;
