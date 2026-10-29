import { type ReactElement, type ReactNode, Suspense, use, useEffect, useState } from 'react';
import { NavigationBar, NavigationProvider } from '../src/lib/navigation';
import { WorkshopNavigation } from './navigation';

// A navigation that never arrives, for the stories of the site's loading standard
// (claude-docs/workshop.md, "Notes the `.storybook/` files cite"). "Start Over" ends the wait.

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

// A transformed box, so the page bar sits under the global bar as in the app
// (claude-docs/workshop.md, "Notes the `.storybook/` files cite").
const barFrame = { transform: 'translateZ(0)', overflow: 'hidden' } as const;

/**
 * Draws `children` in the real navigation provider with every navigation left on its way. `press`
 * names a link to press on mount; `bar` draws the page bar, for a story inside the shell frame.
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
