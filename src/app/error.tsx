'use client';

import Link from 'next/link';
import ErrorPage from '../components/ErrorPage';

// The boundary for an error thrown while a page renders, with a 500. Next's redirect, `notFound()` and
// `forbidden()` signals never reach it. Only the digest is shown, as production strips the message and
// stack (claude-docs/components/error-page.md). `(shell)/error.tsx` re-exports it to keep the shell's bar.
export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ErrorPage
      title="Something Went Wrong"
      reason="The page could not be shown. Trying again often works."
      reference={error.digest}
    >
      <button type="button" className="btn btn--solid" onClick={() => retry()}>
        Try Again
      </button>
      <Link className="btn btn--quiet" href="/">
        Back to Sorrel &amp; Salt
      </Link>
    </ErrorPage>
  );
}
