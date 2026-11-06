import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Navigating } from '../../support/navigating';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
// The address the shell is showing, set by each test before it renders.
const here = vi.hoisted(() => ({ pathname: '/compendium' }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => here.pathname,
}));
vi.mock('@/app/skeletons', async () => ({
  skeletons: (await import('../../support/skeleton-registry')).testSkeletons,
}));

const { usePendingNavigation } = await import('@/lib/navigation');
const { default: MainBody } = await import('@/components/AppShell/main-body');

// The shell's body. While a navigation is on its way it draws the destination's own skeleton,
// chosen by the address from the registry, over the held page: for a page drawn straight in the
// shell, and for a coven or admin page whose section host is not standing for it (going into a
// coven from the compendium draws the whole frame). A section that is standing draws its own;
// a move within the same page, a refresh, and an address no page answers draw nothing here
// (claude-docs/design-decisions/m11.9-plan.md, Part 1).

let arrive = () => {};
let go: (href: string) => void = () => {};
let refresh: () => void = () => {};

function Starter() {
  const navigation = usePendingNavigation();
  go = (href) => navigation.navigate(href);
  refresh = () => navigation.refresh();
  return null;
}

function renderBody(from: string, push = router.push) {
  here.pathname = from;
  const arrives = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  return render(
    <Navigating push={push} arrives={arrives}>
      <Starter />
      <MainBody>
        <main>
          <p>The old page</p>
        </main>
      </MainBody>
    </Navigating>,
  );
}

const skeleton = (name: string) => screen.queryByRole('region', { name });
const oldPageHeld = () => screen.getByText('The old page').closest('[inert]') !== null;

/** Nothing of a wait shows: the page is in reach, and no skeleton or status stands over it. */
function expectNoWait() {
  expect(oldPageHeld()).toBe(false);
  expect(screen.queryAllByRole('region')).toEqual([]);
  expect(screen.queryByRole('status')).toBeNull();
}

beforeEach(() => {
  for (const call of Object.values(router)) call.mockReset();
});

afterEach(async () => {
  await act(async () => arrive());
});

// The page under test hides nothing of its own, so anything hidden from
// assistive technology is the skeleton left over the arrived page.
const hiddenFrom = (container: HTMLElement): Element | null =>
  container.querySelector('[aria-hidden="true"]');

describe('MainBody', () => {
  it('shows the page at rest', () => {
    renderBody('/compendium');
    expectNoWait();
  });

  // The page is held beneath the skeleton, not removed, so it is
  // proved out of reach rather than absent: inert, and its landmark hidden.
  it("draws a shell page's own skeleton over the held page, in the one main landmark with one status", async () => {
    renderBody('/compendium');

    await act(async () => go('/coven'));

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(oldPageHeld()).toBe(true);
    const main = screen.getByRole('main');
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(main.contains(skeleton('Covens skeleton'))).toBe(true);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(main.contains(screen.getByRole('status'))).toBe(true);
    // Only the destination's: no other entry of the registry is drawn.
    expect(screen.getAllByRole('region')).toHaveLength(1);
  });

  it('chooses the skeleton by the address alone, query and all', async () => {
    renderBody('/coven');

    await act(async () => go('/compendium?q=testwort'));

    expect(skeleton('Compendium skeleton')).toBeInTheDocument();
  });

  // No coven host stands outside a coven, so the shell draws its whole frame.
  it('draws a coven page from outside any coven', async () => {
    renderBody('/compendium');

    await act(async () => go('/coven/testwort-circle/ingredients'));

    expect(oldPageHeld()).toBe(true);
    expect(skeleton('Ingredients skeleton')).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  // Another coven's layout is not the one standing: the old coven's goes with its page.
  it('draws a page of another coven than the one standing', async () => {
    renderBody('/coven/testwort-circle/ingredients');

    await act(async () => go('/coven/brambleroot-circle'));

    expect(oldPageHeld()).toBe(true);
    expect(skeleton('Coven home skeleton')).toBeInTheDocument();
  });

  it("leaves a page of the standing coven to the coven's own host", async () => {
    renderBody('/coven/testwort-circle/ingredients');

    await act(async () => go('/coven/testwort-circle'));

    // Why it could have drawn: the navigation is on its way to a registered page.
    expect(router.push).toHaveBeenCalledTimes(1);
    expectNoWait();
  });

  it('draws an admin page from outside the admin area', async () => {
    renderBody('/compendium');

    await act(async () => go('/curator/forms'));

    expect(oldPageHeld()).toBe(true);
    expect(skeleton('Forms skeleton')).toBeInTheDocument();
  });

  // The curator and keepers areas are separate layouts, each with its own host.
  it("draws a curator page from the keepers' area, whose host does not stand for it", async () => {
    renderBody('/keepers/users');

    await act(async () => go('/curator/forms'));

    expect(skeleton('Forms skeleton')).toBeInTheDocument();
  });

  it("leaves a page of the standing admin area to that area's own host", async () => {
    renderBody('/curator/categories');

    await act(async () => go('/curator/forms'));

    expect(router.push).toHaveBeenCalledTimes(1);
    expectNoWait();
  });

  // A pager or a filter replaces the query on the same page, whose list frame draws its own wait.
  it('draws nothing for a move within the same page', async () => {
    renderBody('/compendium');

    await act(async () => go('/compendium?page=2'));

    expect(router.push).toHaveBeenCalledTimes(1);
    expectNoWait();
  });

  it('draws nothing for a refresh', async () => {
    renderBody('/compendium', router.refresh);

    await act(async () => refresh());

    expect(router.refresh).toHaveBeenCalledTimes(1);
    expectNoWait();
  });

  it('draws nothing for an address no page answers', async () => {
    renderBody('/compendium');

    await act(async () => go('/nowhere'));

    expect(router.push).toHaveBeenCalledTimes(1);
    expectNoWait();
  });

  it('brings the page back once the navigation ends', async () => {
    renderBody('/compendium');
    await act(async () => go('/coven'));
    expect(oldPageHeld()).toBe(true);

    await act(async () => arrive());

    expectNoWait();
  });

  // The skeleton stays over the arrived page for the fade, out of reach
  // of assistive technology and the pointer, and leaves with no layout of its own.
  describe('when the page arrives', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows the page at once, keeps the skeleton hidden over it, then drops it', async () => {
      const { container } = renderBody('/compendium');
      await act(async () => go('/coven'));
      expect(skeleton('Covens skeleton')).toBeInTheDocument();
      await act(async () => arrive());

      expect(oldPageHeld()).toBe(false);
      expect(hiddenFrom(container)).not.toBeNull();
      expect(skeleton('Covens skeleton')).toBeNull();
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.getAllByRole('main')).toHaveLength(1);

      await act(async () => vi.advanceTimersByTime(200));
      expect(hiddenFrom(container)).toBeNull();
      expect(screen.getByText('The old page')).toBeTruthy();
    });

    it('has no skeleton to fade after a navigation that drew none', async () => {
      const { container } = renderBody('/compendium');
      await act(async () => go('/nowhere'));
      await act(async () => arrive());
      expect(hiddenFrom(container)).toBeNull();
    });
  });
});
