'use client';

import type { Route } from 'next';
import type { ReactElement } from 'react';
import { useActualPathname } from '../../lib/use-actual-pathname';
import { bugReportQuery } from '../../lib/support-path';
import { ModalLink } from '../Modal';
import IconTip from '../IconTip/icon-tip';
import { SupportIcon } from '../IconTip/icons';
import type { ReportThisProps } from './types';

// Opens the Support dialog over the page (claude-docs/components/error-page.md).

const ReportThis = ({ code, reference, detail }: ReportThisProps): ReactElement => {
  const pathname = useActualPathname();
  // With no path to name, a query on its own keeps the address the browser is at.
  const href = `${pathname ?? ''}?${bugReportQuery({ code, reference, detail })}`;
  return (
    <IconTip tip="Report This">
      <ModalLink className="btn btn--quiet btn--icon" href={href as Route}>
        <SupportIcon />
        <span className="visually-hidden">Report This</span>
      </ModalLink>
    </IconTip>
  );
};

export default ReportThis;
