'use client';

import ErrorPage from '../components/ErrorPage';
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
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body>
        <ErrorPage
          title="Something Went Wrong"
          reason="The site could not be shown. Trying again often works."
          reference={error.digest}
        >
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- see above */}
          <a className="btn btn--solid" href="/">
            Back to Sorrel &amp; Salt
          </a>
          <a
            className="btn btn--quiet"
            href={reportHref(error.digest)}
            data-digest={error.digest}
            onClick={(event) => addFrom(event.currentTarget)}
          >
            Report This
          </a>
        </ErrorPage>
      </body>
    </html>
  );
}
