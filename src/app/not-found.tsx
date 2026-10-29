import Link from 'next/link';
import ErrorPage from '../components/ErrorPage';

// What `notFound()` and an address with no page render, with a 404. The root one covers the public
// pages; `(shell)/not-found.tsx` re-exports it so a signed-in page keeps the shell's bar. A
// workspace's slug that is not yours lands here too, and the page says nothing that tells it from one
// that does not exist (CLAUDE.md, "Domain invariants").
export default function NotFound() {
  return (
    <ErrorPage title="Page Not Found" reason="There is nothing at this address.">
      <Link className="btn btn--quiet" href="/">
        Back to Sorrel &amp; Salt
      </Link>
    </ErrorPage>
  );
}
