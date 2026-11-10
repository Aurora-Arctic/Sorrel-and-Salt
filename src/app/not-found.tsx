import { NotFoundScreen } from '../components/ErrorScreens';

// What `notFound()` renders from a page outside the shell and the unmatched group, with a 404.
// `(shell)/not-found.tsx` renders the same screen inside the shell, and `(unmatched)` draws an unknown
// address in the shell or the public frame. A workspace slug that is not yours lands here too,
// saying nothing that tells it from a missing one.
export default function NotFound() {
  return <NotFoundScreen />;
}
