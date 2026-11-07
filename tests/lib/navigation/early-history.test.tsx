import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/here' }));

const { NavigationProvider, usePendingNavigation } = await import('@/lib/navigation');

// A press moves the address bar and the history at once, so Back pressed during the wait returns to the page that was left rather than the one before it.

function Go({ href, options }: { href: string; options?: { replace?: boolean } }) {
  const { navigate } = usePendingNavigation();
  return (
    <button type="button" onClick={() => navigate(href, options)}>
      Go
    </button>
  );
}

const press = (href: string, options?: { replace?: boolean }) => {
  render(
    <NavigationProvider>
      <Go href={href} options={options} />
    </NavigationProvider>,
  );
  return act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
  });
};

let pushState: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  for (const call of Object.values(router)) call.mockReset();
  pushState = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
});
afterEach(() => {
  pushState.mockRestore();
});

describe('Forward onto an entry pushed early and never arrived at', () => {
  it('fetches that address afresh, and the router never restores the tree it carries', async () => {
    render(
      <NavigationProvider>
        <Go href="/there" />
      </NavigationProvider>,
    );
    const router_ = vi.fn();
    window.addEventListener('popstate', router_);
    const entry = { __NA: true, earlyEntry: true };
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: entry }));
    });
    window.removeEventListener('popstate', router_);
    expect(router.replace).toHaveBeenCalledWith(
      `${window.location.pathname}${window.location.search}`,
    );
  });

  it('is left to the router when the entry is an ordinary one', async () => {
    render(
      <NavigationProvider>
        <Go href="/there" />
      </NavigationProvider>,
    );
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { __NA: true } }));
    });
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('the history entry of a navigation to another page', () => {
  it('is pushed at once, carrying the router state the current entry holds', async () => {
    const held = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: 'here' } };
    vi.spyOn(window.history, 'state', 'get').mockReturnValue(held);
    await press('/there?x=1');
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState).toHaveBeenCalledWith({ ...held, earlyEntry: true }, '', '/there?x=1');
    // The router replaces the entry just pushed, so a redirect on the way leaves one entry, not two.
    expect(router.replace).toHaveBeenCalledWith('/there?x=1');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('is left to the router when only the query changes', async () => {
    await press('/here?page=2');
    expect(pushState).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/here?page=2');
  });

  it('is left to the router for a replace', async () => {
    await press('/there', { replace: true });
    expect(pushState).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/there');
  });

  it('is left to the browser for an address on another site', async () => {
    await press('https://example.test/there');
    expect(pushState).not.toHaveBeenCalled();
  });
});
