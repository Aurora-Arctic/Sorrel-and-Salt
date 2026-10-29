import { act, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode, Suspense, use, useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Navigating } from '../../support/navigating';

// The App Router as a component test sees it: each call a mock, which
// `Navigating` turns into a navigation that stays on its way until the test
// lets the new page arrive. Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/here' }));

const { NavigationProvider, reportLeaving, useNavigationState, usePendingNavigation } =
  await import('@/lib/navigation');

// The one way the site navigates (claude-docs/design-decisions/m12.33-plan.md): each caller's own
// `pending`, and a site-wide `busy` with the target's region and shape, which the bar and the
// skeletons read wherever they sit.

const COVEN_CARDS = { region: 'coven', shape: 'cards' } as const;

/** A caller of the hook: its button is `aria-busy` while its own navigation is on its way. */
function Go({
  name,
  href,
  options,
  refresh = false,
}: {
  name: string;
  href?: string;
  options?: Record<string, unknown>;
  refresh?: boolean;
}) {
  const navigation = usePendingNavigation();
  return (
    <button
      type="button"
      aria-busy={navigation.pending}
      onClick={() => (refresh ? navigation.refresh() : navigation.navigate(href ?? '', options))}
    >
      {name}
    </button>
  );
}

/** What every part of the page reads: the site-wide state, kept for the test to inspect. */
let state: { busy: boolean; target?: unknown } | undefined;
function Probe() {
  const current = useNavigationState();
  // Read from committed renders only: a transition that suspends re-runs
  // component bodies with the optimistic value already put back.
  useEffect(() => {
    state = current;
  });
  return null;
}

/** A page that arrives when the test says so. Every page a test leaves arrives after it, so the site-wide state starts idle in the next. */
const unarrived: (() => void)[] = [];
function arrival() {
  let arrive = () => {};
  const arrives = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  unarrived.push(() => arrive());
  return { arrives, arrive: () => act(async () => arrive()) };
}

const press = (name: string) =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });

/** The event a browser fires on a page restored from the back-forward cache. */
function pageshow(persisted: boolean): Event {
  const event = new Event('pageshow');
  Object.defineProperty(event, 'persisted', { value: persisted });
  return event;
}

beforeEach(() => {
  for (const call of Object.values(router)) call.mockReset();
  state = undefined;
});

afterEach(async () => {
  // A full load reported by a test ends here, as does a page it left on its way.
  await act(async () => {
    for (const arrive of unarrived.splice(0)) arrive();
    window.dispatchEvent(pageshow(true));
  });
});

describe('usePendingNavigation', () => {
  it('pushes the address, and is pending until the new page has rendered', async () => {
    const { arrives, arrive } = arrival();
    render(
      <Navigating push={router.push} arrives={arrives}>
        <Go name="Go" href="/coven/fixture-coven/members" />
      </Navigating>,
    );
    // Why pending could be read as the press's: before it, nothing is on its way.
    expect(screen.getByRole('button', { name: 'Go' })).toHaveAttribute('aria-busy', 'false');

    await press('Go');

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push.mock.calls[0]?.[0]).toBe('/coven/fixture-coven/members');
    expect(screen.getByRole('button', { name: 'Go' })).toHaveAttribute('aria-busy', 'true');

    await arrive();

    expect(screen.getByRole('button', { name: 'Go' })).toHaveAttribute('aria-busy', 'false');
  });

  it('replaces rather than pushes when asked, and passes a kept scroll on', async () => {
    render(
      <Navigating push={router.replace} arrives={arrival().arrives}>
        <Go name="Replace" href="/list?q=a" options={{ replace: true, scroll: false }} />
      </Navigating>,
    );

    await press('Replace');

    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith(
      '/list?q=a',
      expect.objectContaining({ scroll: false }),
    );
    expect(screen.getByRole('button', { name: 'Replace' })).toHaveAttribute('aria-busy', 'true');
  });

  it("is pending through a refresh, until the server's new render arrives", async () => {
    const { arrives, arrive } = arrival();
    render(
      <Navigating push={router.refresh} arrives={arrives}>
        <Go name="Refresh" refresh />
        <Probe />
      </Navigating>,
    );

    await press('Refresh');

    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Refresh' })).toHaveAttribute('aria-busy', 'true');
    expect(state?.busy).toBe(true);

    await arrive();

    expect(screen.getByRole('button', { name: 'Refresh' })).toHaveAttribute('aria-busy', 'false');
    expect(state?.busy).toBe(false);
  });
});

describe('useNavigationState', () => {
  it('is idle, with no target, while nothing is on its way', () => {
    render(<Probe />);

    expect(state).toEqual({ busy: false, target: undefined });
  });

  it("is busy for every caller while one caller's navigation is on its way, and only that caller is pending", async () => {
    const { arrives, arrive } = arrival();
    render(
      <Navigating push={router.push} arrives={arrives}>
        <Go
          name="Switch"
          href="/coven/testwort-circle/ingredients"
          options={{ target: COVEN_CARDS }}
        />
        <Go name="Other" href="/coven/testwort-circle" />
        <Probe />
      </Navigating>,
    );

    await press('Switch');

    expect(state).toEqual({ busy: true, target: COVEN_CARDS });
    expect(screen.getByRole('button', { name: 'Switch' })).toHaveAttribute('aria-busy', 'true');
    // The other caller started nothing: the page is busy, its own control is not.
    expect(screen.getByRole('button', { name: 'Other' })).toHaveAttribute('aria-busy', 'false');

    await arrive();

    expect(state).toEqual({ busy: false, target: undefined });
  });

  it('is busy with no target for a navigation that names none', async () => {
    render(
      <Navigating push={router.push} arrives={arrival().arrives}>
        <Go name="Go" href="/compendium" />
        <Probe />
      </Navigating>,
    );

    await press('Go');

    expect(state?.busy).toBe(true);
    expect(state?.target).toBeUndefined();
  });

  it('reads the same state from a part mounted apart from the caller', async () => {
    // Two branches: the bar sits in the providers, the caller deep in a page.
    render(
      <Navigating push={router.push} arrives={arrival().arrives}>
        <Probe />
        <section>
          <Go name="Go" href="/coven/fixture-coven/members" />
        </section>
      </Navigating>,
    );

    await press('Go');

    expect(state?.busy).toBe(true);
  });
});

/** A region that takes its children away while a navigation is on its way, as `MainBody` does. */
function Region({ children }: { children: ReactNode }) {
  const { busy } = useNavigationState();
  return busy ? <output>Loading</output> : children;
}

function Hang({ until }: { until: Promise<void> }): ReactNode {
  use(until);
  return null;
}

describe('a navigation whose caller is taken off the page', () => {
  it('stays busy until the new page arrives, though the pressed control is gone', async () => {
    const { arrives, arrive } = arrival();
    render(
      <Navigating push={router.push} arrives={arrives}>
        <Probe />
        <Region>
          <Go name="Go" href="/admin/forms" options={{ target: COVEN_CARDS }} />
        </Region>
      </Navigating>,
    );

    await press('Go');

    expect(screen.queryByRole('button', { name: 'Go' })).toBeNull();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(state).toEqual({ busy: true, target: COVEN_CARDS });

    // Still waiting a while on: nothing the swap did has ended the wait.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    await arrive();

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
    expect(state).toEqual({ busy: false, target: undefined });
  });
});

describe('two navigations that overlap', () => {
  it('shows the later one, and ends when both have arrived', async () => {
    const first = arrival();
    const second = arrival();
    const arrivals = [first.arrives, second.arrives];
    const TABLE = { region: 'main', shape: 'table' } as const;
    function Router() {
      const [started, setStarted] = useState<number[]>([]);
      router.push.mockImplementation(() => setStarted((current) => [...current, current.length]));
      return (
        <Suspense fallback={null}>
          {started.map((n) => (
            <Hang key={n} until={arrivals[n]!} />
          ))}
        </Suspense>
      );
    }
    render(
      <NavigationProvider>
        <Go name="A" href="/a" options={{ target: COVEN_CARDS }} />
        <Go name="B" href="/b" options={{ target: TABLE }} />
        <Probe />
        <Router />
      </NavigationProvider>,
    );

    await press('A');
    await press('B');

    expect(state).toEqual({ busy: true, target: TABLE });
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('aria-busy', 'true');
    // A was superseded: the wait is B's, so A's control is no longer the pressed one.
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('aria-busy', 'false');

    await first.arrive();
    // A has arrived; B is still on its way, and the wait is still B's.
    expect(state).toEqual({ busy: true, target: TABLE });

    await second.arrive();
    expect(state).toEqual({ busy: false, target: undefined });
  });
});

describe('outside the provider', () => {
  it('still navigates, and shows no wait', async () => {
    render(
      <>
        <Go name="Go" href="/compendium" />
        <Probe />
      </>,
    );

    await press('Go');

    expect(router.push).toHaveBeenCalledWith('/compendium');
    expect(state?.busy).toBe(false);
  });
});

describe('reportLeaving', () => {
  it('keeps the page busy until the browser leaves, however long that takes', async () => {
    vi.useFakeTimers();
    try {
      render(<Probe />);
      expect(state?.busy).toBe(false);

      act(() => reportLeaving());
      expect(state?.busy).toBe(true);

      // A slow provider redirect: nothing on the page settles it.
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(state?.busy).toBe(true);

      // A page that is shown fresh is not this page come back.
      act(() => {
        window.dispatchEvent(pageshow(false));
      });
      expect(state?.busy).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ends when the page comes back from the back-forward cache', () => {
    render(<Probe />);
    act(() => reportLeaving());
    expect(state?.busy).toBe(true);

    act(() => {
      window.dispatchEvent(pageshow(true));
    });

    expect(state?.busy).toBe(false);
  });
});
