import Link from 'next/link';
import ErrorPage from '../components/ErrorPage';

// What `notFound()` and an unmatched address render, with a 404. `(shell)/not-found.tsx` re-exports it
// to keep the shell's bar. A workspace slug that is not yours lands here too, saying nothing that tells
// it from a missing one.
export default function NotFound() {
  return (
    <ErrorPage title="Page Not Found" reason="There is nothing at this address.">
      <Link className="btn btn--quiet" href="/">
        Back to Sorrel &amp; Salt
      </Link>
    </ErrorPage>
  );
}
