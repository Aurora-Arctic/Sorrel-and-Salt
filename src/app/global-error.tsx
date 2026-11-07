'use client';

import ErrorPage from '../components/ErrorPage';
import { SupportIcon } from '../components/IconTip/icons';
import './globals.scss';

// Sign-in-free address of the bug form; the digest rides as ref.
const reportHref = (digest?: string): string =>
  `/support?support=bug&error=500${digest ? `&ref=${encodeURIComponent(digest)}` : ''}`;

// The page the visitor was on goes as `from`, read from the address bar when the link is pressed, since this
// boundary only knows the route pattern and rendering it on the server has no address to read.
const addFrom = (link: HTMLAnchorElement): void => {
  link.href = `${reportHref(link.getAttribute('data-digest') ?? undefined)}&from=${encodeURIComponent(window.location.pathname)}`;
};

// The boundary for an error in the root layout itself, which `error.tsx` cannot catch. Plain anchors, not `next/link`,
// and no Report This: the router may be what failed, and a full load starts clean.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorPage
          title="Something Went Wrong"
          reason="The site could not be shown. Trying again often works."
          reference={error.digest}
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
            href={reportHref(error.digest)}
            data-digest={error.digest}
            onClick={(event) => addFrom(event.currentTarget)}
          >
            <SupportIcon />
            <span className="visually-hidden">Report This</span>
          </a>
        </ErrorPage>
      </body>
    </html>
  );
}
