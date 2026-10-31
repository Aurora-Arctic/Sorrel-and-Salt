'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import ErrorPage from '../ErrorPage';
import ReportThis from '../ReportThis';

// The 404 and 500 screens, shared by the root routes and the shell's, which differ only in whether the
// Support dialog is in the page for Report This to open (claude-docs/components/error-page.md).

export const NotFoundScreen = ({ inShell = false }: { inShell?: boolean }): ReactElement => (
  <ErrorPage title="Page Not Found" reason="There is nothing at this address.">
    <Link className="btn btn--quiet" href="/">
      Back to Sorrel &amp; Salt
    </Link>
    <ReportThis code={404} inShell={inShell} />
  </ErrorPage>
);

export const ErrorScreen = ({
  digest,
  retry,
  inShell = false,
}: {
  digest?: string;
  retry: () => void;
  inShell?: boolean;
}): ReactElement => (
  <ErrorPage
    title="Something Went Wrong"
    reason="The page could not be shown. Trying again often works."
    reference={digest}
  >
    <button type="button" className="btn btn--solid" onClick={() => retry()}>
      Try Again
    </button>
    <Link className="btn btn--quiet" href="/">
      Back to Sorrel &amp; Salt
    </Link>
    <ReportThis code={500} reference={digest} inShell={inShell} />
  </ErrorPage>
);
