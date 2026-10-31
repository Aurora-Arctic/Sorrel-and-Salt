'use client';

import { ErrorScreen } from '../../components/ErrorScreens';

export default function ShellErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorScreen digest={error.digest} retry={retry} inShell />;
}
