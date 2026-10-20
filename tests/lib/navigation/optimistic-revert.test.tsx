import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  type ReactNode,
  Suspense,
  startTransition,
  use,
  useEffect,
  useOptimistic,
  useState,
} from 'react';
import { describe, expect, it } from 'vitest';

// The platform behaviour the navigation provider stands on (M12.33): a value
// set with `useOptimistic` inside a transition lasts as long as that
// transition and goes back by itself when it ends. Nothing here is the site's
// code; if React stopped behaving this way, the provider could not rely on it.
//
// The stand-ins: `Router` is the App Router, whose `push` is a state update
// inside the caller's transition that stays suspended until the new page has
// arrived; `Region` is MainBody, which takes its children away while the
// optimistic target is set, and so unmounts the very control that started
// the navigation.

type Go = (href: string) => void;

function arrival() {
  let arrive = () => {};
  const arrives = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  return { arrives, arrive: () => act(async () => arrive()) };
}

function Hang({ until }: { until: Promise<void> }): ReactNode {
  use(until);
  return null;
}

/** Owner of the optimistic value and the router, mounted once and never removed. */
function Owner({
  arrives,
  children,
  onTarget,
}: {
  arrives: Promise<void>[];
  children: (go: Go, target: string | undefined) => ReactNode;
  onTarget: (target: string | undefined) => void;
}) {
  const [target, setTarget] = useOptimistic<string | undefined>(undefined);
  const [routed, setRouted] = useState<string[]>([]);
  useEffect(() => {
    onTarget(target);
  });
  const go: Go = (href) => {
    startTransition(() => {
      setTarget(href);
      setRouted((current) => [...current, href]);
    });
  };
  return (
    <>
      {children(go, target)}
      <Suspense fallback={null}>
        {routed.map((href, index) => (
          <Hang key={`${href}-${index}`} until={arrives[index] ?? arrives[arrives.length - 1]!} />
        ))}
      </Suspense>
    </>
  );
}

describe('useOptimistic around a router transition', () => {
  it('holds the value for the whole transition and drops it when the transition ends', async () => {
    const first = arrival();
    let seen: string | undefined;
    render(
      <Owner arrives={[first.arrives]} onTarget={(target) => (seen = target)}>
        {(go) => (
          <button type="button" onClick={() => go('/a')}>
            Go
          </button>
        )}
      </Owner>,
    );
    expect(seen).toBeUndefined();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    });
    expect(seen).toBe('/a');

    // Still set a while later: the router has not answered.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(seen).toBe('/a');

    await first.arrive();

    expect(seen).toBeUndefined();
  });

  it('still drops it when the control that started the navigation was unmounted mid-transition', async () => {
    const first = arrival();
    let seen: string | undefined;
    render(
      <Owner arrives={[first.arrives]} onTarget={(target) => (seen = target)}>
        {(go, target) =>
          // The region swap: while a target is set, the control is not drawn.
          target ? (
            <p role="status">Loading</p>
          ) : (
            <button type="button" onClick={() => go('/a')}>
              Go
            </button>
          )
        }
      </Owner>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    });

    // The control is gone, and the wait is not over.
    expect(screen.queryByRole('button', { name: 'Go' })).toBeNull();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(seen).toBe('/a');

    await first.arrive();

    expect(seen).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });

  it('keeps the latest value when a second navigation starts before the first ends, and drops it when both have', async () => {
    const first = arrival();
    const second = arrival();
    let seen: string | undefined;
    render(
      <Owner arrives={[first.arrives, second.arrives]} onTarget={(target) => (seen = target)}>
        {(go) => (
          <>
            <button type="button" onClick={() => go('/a')}>
              A
            </button>
            <button type="button" onClick={() => go('/b')}>
              B
            </button>
          </>
        )}
      </Owner>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'A' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'B' }));
    });
    expect(seen).toBe('/b');

    await first.arrive();
    // The first has arrived; the second is still on its way.
    expect(seen).toBe('/b');

    await second.arrive();
    expect(seen).toBeUndefined();
  });
});
