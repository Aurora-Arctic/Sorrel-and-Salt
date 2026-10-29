import { type ReactNode, Suspense, use, useState } from 'react';
import { NavigationProvider } from '@/lib/navigation';
import type { NavigatingProps } from './types';

// A navigation as the App Router runs one, for a test that mocks `next/navigation`: `push` becomes a state
// update inside the caller's transition, suspended until a server render that never arrives, so `isPending`
// stays true as in a browser. A test that needs the page to arrive passes `arrives` and settles it.

const never = new Promise<never>(() => undefined);

function Hang({ until }: { until: Promise<void> }): ReactNode {
  use(until);
  return null;
}

export function Navigating({ push, children, arrives = never }: NavigatingProps): ReactNode {
  const [going, setGoing] = useState(false);
  push.mockImplementation(() => setGoing(true));
  return (
    <>
      <NavigationProvider>{children}</NavigationProvider>
      <Suspense fallback={null}>{going && <Hang until={arrives} />}</Suspense>
    </>
  );
}
