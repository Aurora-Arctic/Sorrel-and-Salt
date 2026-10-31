'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import ErrorPage from '../ErrorPage';
import ReportThis from '../ReportThis';

// The 404 and 500 screens, shared by the root routes and the shell's (claude-docs/components/error-page.md).

export const NotFoundScreen = (): ReactElement => (
  <ErrorPage title="Page Not Found" reason="There is nothing at this address.">
    <Link className="btn btn--quiet" href="/">
      Back to Sorrel &amp; Salt
    </Link>
    <ReportThis code={404} />
  </ErrorPage>
);

export const ErrorScreen = ({
  digest,
  retry,
}: {
  digest?: string;
  retry: () => void;
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
    <ReportThis code={500} reference={digest} />
  </ErrorPage>
);
