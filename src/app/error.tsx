'use client';

import { ErrorScreen } from '../components/ErrorScreens';

// The boundary for an error thrown while a page renders, with a 500. Next's redirect, `notFound()` and
// `forbidden()` signals never reach it. Only the digest is shown, as production strips the message and
// stack (claude-docs/components/error-page.md). `(shell)/error.tsx` renders it with the shell's dialog.
export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorScreen digest={error.digest} retry={retry} />;
}
