'use client';

import ErrorPage from '@/components/ErrorPage';
import { SupportIcon } from '@/components/IconTip/icons';
import { useErrorReport } from '@/lib/error-report';
import { SUPPORT_FROM_PARAM, SUPPORT_PATH, bugReportQuery } from '@/lib/support-path';
import './globals.scss';

// The boundary for an error in the root layout itself, which `error.tsx` cannot catch. Plain anchors, not `next/link`,
// and no Report This: the router may be what failed, and a full load starts clean.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const { reference, detail } = useErrorReport(error);
  // Sign-in-free address of the bug form.
  const reportHref = `${SUPPORT_PATH}?${bugReportQuery({ code: 500, reference, detail })}`;
  return (
    <html lang="en">
      <body>
        <ErrorPage
          title="Something Went Wrong"
          reason="The site could not be shown. Trying again often works."
          reference={reference}
        >
          <button type="button" className="btn btn--solid" onClick={() => retry()}>
            Try Again
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- see above */}
          <a className="btn btn--quiet" href="/">
            Back to Sorrel &amp; Salt
          </a>
          <a
            className="btn btn--quiet btn--icon"
            href={reportHref}
            // The page goes as `from`, read from the address bar when the link is pressed, since this boundary only
            // knows the route pattern and rendering it on the server has no address to read.
            onClick={(event) => {
              event.currentTarget.href = `${reportHref}&${new URLSearchParams({ [SUPPORT_FROM_PARAM]: window.location.pathname })}`;
            }}
          >
            <SupportIcon />
            <span className="visually-hidden">Report This</span>
          </a>
        </ErrorPage>
      </body>
    </html>
  );
}
