import { NotFoundScreen } from '../components/ErrorScreens';

// What `notFound()` and an unmatched address render, with a 404. `(shell)/not-found.tsx` renders the same
// screen with the shell's Support dialog in reach. A workspace slug that is not yours lands here too,
// saying nothing that tells it from a missing one.
export default function NotFound() {
  return <NotFoundScreen />;
}
