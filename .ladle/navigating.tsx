import { type ReactElement, type ReactNode, Suspense, use, useEffect, useState } from 'react';
import { NavigationProvider } from '../src/lib/navigation';
import { WorkshopNavigation } from './navigation';

// A navigation that never arrives, for the stories of the site's loading
// standard (M12.33). The workshop's router goes nowhere, so a press would end
// its wait at once. Here the router call suspends inside the same transition,
// under an already-shown boundary, which keeps the transition pending as the
// App Router does until a page renders: the page bar's state, the link's
// `aria-busy` and the body's skeleton all stay on screen. The same trick
// tests/support/navigating.tsx plays with a mocked router.
// "Start Over" remounts the whole thing, which is the only way a wait here ends.

const never = new Promise<never>(() => undefined);

function Hang(): null {
  use(never);
  return null;
}

/** Presses the first link named `name`, as a person would, once the story has mounted. */
function usePressLinkOnMount(name: string | undefined): void {
  useEffect(() => {
    if (!name) return;
    [...document.querySelectorAll<HTMLAnchorElement>('a')]
      .find((link) => link.textContent?.trim() === name)
      ?.click();
  }, [name]);
}

function Round({ press, children }: { press?: string; children: ReactNode }): ReactElement {
  const [going, setGoing] = useState(false);
  usePressLinkOnMount(press);
  return (
    <WorkshopNavigation.Provider value={() => setGoing(true)}>
      <NavigationProvider>{children}</NavigationProvider>
      <Suspense fallback={null}>{going && <Hang />}</Suspense>
    </WorkshopNavigation.Provider>
  );
}

/**
 * Draws `children` inside the real navigation provider, with every navigation
 * left on its way. `press` names a link to press on mount, so a story can open
 * mid-wait; without it the story opens at rest and a press starts the wait.
 */
export function Navigating({
  press,
  children,
}: {
  press?: string;
  children: ReactNode;
}): ReactElement {
  const [round, setRound] = useState(0);
  return (
    <>
      <Round key={round} press={press}>
        {children}
      </Round>
      <p>
        <button type="button" className="btn btn--quiet" onClick={() => setRound(round + 1)}>
          Start Over
        </button>
      </p>
    </>
  );
}
