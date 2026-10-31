'use client';

import ErrorPage from '../components/ErrorPage';
import './globals.scss';

// The boundary for an error in the root layout itself, which `error.tsx` cannot catch. It replaces
// that layout, so it draws its own document and imports the global styles. Plain anchors rather than
// `next/link`, and no Report This (which reads the router): the router may be the thing that failed, and a
// full load starts clean.
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
          <a className="btn btn--quiet" href="/support?support=bug&error=500">
            Report This
          </a>
        </ErrorPage>
      </body>
    </html>
  );
}
