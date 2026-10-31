'use client';

import type { Route } from 'next';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useActualPathname } from '../../lib/use-actual-pathname';
import { SUPPORT_ERROR_PARAM, SUPPORT_PARAM, SUPPORT_REF_PARAM } from '../../lib/support-path';
import IconTip from '../IconTip/icon-tip';
import { SupportIcon } from '../IconTip/icons';
import type { ReportThisProps } from './types';

// The error pages' way to report what they show: a bug request with the status and the page filled in
// (claude-docs/components/report-this.md). It opens the Support dialog over the page.

const ReportThis = ({ code, reference }: ReportThisProps): ReactElement => {
  const pathname = useActualPathname();
  const params = new URLSearchParams({
    [SUPPORT_PARAM]: 'bug',
    [SUPPORT_ERROR_PARAM]: String(code),
  });
  if (reference) params.set(SUPPORT_REF_PARAM, reference);
  // With no path to name, a query on its own keeps the address the browser is at.
  const href = `${pathname ?? ''}?${params}`;
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
