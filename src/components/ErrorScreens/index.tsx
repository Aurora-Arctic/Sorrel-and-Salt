'use client';

import type { ReactElement } from 'react';
import ErrorPage from '../ErrorPage';
import ReportThis from '../ReportThis';
import { useErrorReport } from '../../lib/error-report';
import { PendingLink } from '../../lib/navigation';

// The 404 and 500 screens, shared by the root routes and the shell's (claude-docs/components/error-page.md).

export const NotFoundScreen = ({ withinMain = false }: { withinMain?: boolean }): ReactElement => (
  <ErrorPage
    title="Page Not Found"
    withinMain={withinMain}
    reason="There is nothing at this address."
  >
    <PendingLink className="btn btn--quiet" href="/">
      Back to Sorrel &amp; Salt
    </PendingLink>
    <PendingLink className="btn btn--quiet" href="/help">
      Help
    </PendingLink>
    <ReportThis code={404} />
  </ErrorPage>
);

export const ErrorScreen = ({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}): ReactElement => {
  const { reference, detail } = useErrorReport(error);
  return (
    <ErrorPage
      title="Something Went Wrong"
      reason="The page could not be shown. Trying again often works."
      reference={reference}
    >
      <button type="button" className="btn btn--solid" onClick={() => retry()}>
        Try Again
      </button>
      <PendingLink className="btn btn--quiet" href="/">
        Back to Sorrel &amp; Salt
      </PendingLink>
      <ReportThis code={500} reference={reference} detail={detail} />
    </ErrorPage>
  );
};
