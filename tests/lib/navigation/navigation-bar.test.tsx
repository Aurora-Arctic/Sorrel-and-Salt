import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Navigating } from '../../support/navigating';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/here' }));

const { NavigationBar, reportLeaving, usePendingNavigation } = await import('@/lib/navigation');

// The page part of every wait: a bar that shows once a navigation has lasted 100ms, so a fast
// one never flashes it, and goes when the navigation settles. It only adds a visual cue, so it
// is hidden from assistive technology, and having no role it is found by that.

const DELAY = 100;

function Go() {
  const { navigate } = usePendingNavigation();
  return (
    <button type="button" onClick={() => navigate('/compendium')}>
      Go
    </button>
  );
}

let arrive = () => {};
function renderBar() {
  const arrives = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  return render(
    <Navigating push={router.push} arrives={arrives}>
      <NavigationBar />
      <Go />
    </Navigating>,
  );
}

/** The bar, when it is drawn and not hidden: the one element hidden from assistive technology. */
function shownBar(): Element | null {
  const bar = document.body.querySelector('[aria-hidden="true"]');
  return bar && !bar.closest('[hidden]') ? bar : null;
}

// Awaited: a navigation on its way suspends, which a synchronous act leaves uncommitted.
const after = (ms: number) =>
  act(async () => {
    vi.advanceTimersByTime(ms);
  });

function pageshow(): Event {
  const event = new Event('pageshow');
  Object.defineProperty(event, 'persisted', { value: true });
  return event;
}

beforeEach(() => {
  vi.useFakeTimers();
  router.push.mockReset();
});

afterEach(async () => {
  await act(async () => {
    arrive();
    window.dispatchEvent(pageshow());
  });
  vi.useRealTimers();
});

describe('NavigationBar', () => {
  it('is not shown while nothing is on its way', async () => {
    renderBar();

    await after(DELAY * 10);

    expect(shownBar()).toBeNull();
  });

  it('shows once a navigation has lasted 100ms, hidden from assistive technology, and goes when it settles', async () => {
    renderBar();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    });
    // Why the bar's absence below is the delay's: the navigation is on its way.
    expect(router.push).toHaveBeenCalledTimes(1);

    await after(DELAY - 1);
    expect(shownBar()).toBeNull();

    await after(1);
    const bar = shownBar();
    expect(bar).not.toBeNull();
    expect(bar).toHaveAttribute('aria-hidden', 'true');

    await act(async () => arrive());

    expect(shownBar()).toBeNull();
  });

  it('never shows for a navigation that settles inside 100ms', async () => {
    renderBar();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    });
    await after(DELAY - 1);
    await act(async () => arrive());
    await after(DELAY * 10);

    expect(shownBar()).toBeNull();
  });

  it('shows through a full load until the browser leaves', async () => {
    renderBar();

    act(() => reportLeaving());
    await after(DELAY);

    expect(shownBar()).not.toBeNull();

    // The page came back from the back-forward cache: nothing is on its way.
    act(() => {
      window.dispatchEvent(pageshow());
    });

    expect(shownBar()).toBeNull();
  });
});
