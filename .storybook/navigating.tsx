import { type ReactElement, type ReactNode, Suspense, use, useEffect, useState } from 'react';
import { NavigationBar, NavigationProvider } from '../src/lib/navigation';
import { WorkshopNavigation } from './navigation';

// A navigation that never arrives, for the stories of the site's loading
// standard. The workshop's router goes nowhere, so a press would end
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

function Round({
  press,
  bar,
  children,
}: {
  press?: string;
  bar: boolean;
  children: ReactNode;
}): ReactElement {
  const [going, setGoing] = useState(false);
  usePressLinkOnMount(press);
  return (
    <WorkshopNavigation.Provider value={() => setGoing(true)}>
      {/* The page bar where src/app/providers.tsx mounts it, inside the provider. */}
      <NavigationProvider>
        {bar && <NavigationBar />}
        {children}
      </NavigationProvider>
      <Suspense fallback={null}>{going && <Hang />}</Suspense>
    </WorkshopNavigation.Provider>
  );
}

// The page bar is `position: fixed` against the window, but the shell frame
// pads the shell in from the window's edge. A transformed box makes it the
// bar's containing block, so the bar lands on the global bar's bottom edge as
// in the app. The box also becomes the skip link's, whose hiding (lifted above
// the page's top edge) then leaves it in view; the clip hides it again, and it
// still shows on focus, where it moves back inside the box.
const barFrame = { transform: 'translateZ(0)', overflow: 'hidden' } as const;

/**
 * Draws `children` inside the real navigation provider, with every navigation
 * left on its way. `press` names a link to press on mount, so a story can open
 * mid-wait; without it the story opens at rest and a press starts the wait.
 * `bar` draws the page bar, for a story inside the shell frame, which has the
 * global bar for it to sit under.
 */
export function Navigating({
  press,
  bar = false,
  children,
}: {
  press?: string;
  bar?: boolean;
  children: ReactNode;
}): ReactElement {
  const [round, setRound] = useState(0);
  const content = (
    <Round key={round} press={press} bar={bar}>
      {children}
    </Round>
  );
  return (
    <>
      {bar ? <div style={barFrame}>{content}</div> : content}
      <p>
        <button type="button" className="btn btn--quiet" onClick={() => setRound(round + 1)}>
          Start Over
        </button>
      </p>
    </>
  );
}
