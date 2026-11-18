'use client';

import type { ReactElement } from 'react';
import ErrorPage from '../ErrorPage';
import { BackToSite, WayOn } from '../ErrorPage/way-on';
import ReportThis from '../ReportThis';
import { useErrorReport } from '../../lib/error-report';

// The 404 and 500 screens, shared by the root routes and the shell's (claude-docs/components/error-page.md).

export const NotFoundScreen = ({ withinMain = false }: { withinMain?: boolean }): ReactElement => (
  <ErrorPage
    title="Page Not Found"
    withinMain={withinMain}
    reason="There is nothing at this address."
  >
    <WayOn code={404} />
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
      <span className="error-page__pair">
        <BackToSite />
        <ReportThis code={500} reference={reference} detail={detail} />
      </span>
    </ErrorPage>
  );
};
