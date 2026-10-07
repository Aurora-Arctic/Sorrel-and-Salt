import { type ReactNode, Suspense, use, useState } from 'react';
import type { NavigatingProps } from './types';

// A navigation as the App Router runs one, for a test that mocks
// `next/navigation`: `push` becomes a state update inside the caller's
// transition, suspended until a server render that never arrives. An
// already-shown boundary keeps the transition pending rather than showing a
// fallback, so the caller's `isPending` stays true, as it does in a browser
// until the next page renders.

const never = new Promise<never>(() => undefined);

function Hang(): ReactNode {
  return use(never);
}

export function Navigating({ push, children }: NavigatingProps): ReactNode {
  const [going, setGoing] = useState(false);
  push.mockImplementation(() => setGoing(true));
  return (
    <>
      {children}
      <Suspense fallback={null}>{going && <Hang />}</Suspense>
    </>
  );
}
