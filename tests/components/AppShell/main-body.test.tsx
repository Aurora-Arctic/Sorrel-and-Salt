import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavigationTarget } from '@/lib/navigation';
import { Navigating } from '../../support/navigating';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/here' }));

const { usePendingNavigation } = await import('@/lib/navigation');
const { default: MainBody } = await import('@/components/AppShell/main-body');

// While a navigation aimed at the main region is on its way, the page gives
// way to one status inside a main landmark; any other navigation leaves it.

let arrive = () => {};
let go: (target?: NavigationTarget) => void = () => {};

function Starter() {
  const { navigate } = usePendingNavigation();
  go = (target) => navigate('/next', target ? { target } : undefined);
  return null;
}

function renderBody() {
  const arrives = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  return render(
    <Navigating push={router.push} arrives={arrives}>
      <Starter />
      <MainBody>
        <main>
          <p>The old page</p>
        </main>
      </MainBody>
    </Navigating>,
  );
}

afterEach(async () => {
  await act(async () => arrive());
});

describe('MainBody', () => {
  it('shows the page at rest', () => {
    renderBody();
    expect(screen.getByText('The old page')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('swaps the page for one status in a main landmark while a main navigation is pending', async () => {
    renderBody();
    await act(async () => go({ region: 'main', shape: 'page' }));
    expect(screen.queryByText('The old page')).toBeNull();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('main').contains(screen.getByRole('status'))).toBe(true);
  });

  it('leaves the page for a coven navigation', async () => {
    renderBody();
    await act(async () => go({ region: 'coven', shape: 'table' }));
    expect(screen.getByText('The old page')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('leaves the page for a navigation with no target', async () => {
    renderBody();
    await act(async () => go());
    expect(screen.getByText('The old page')).toBeTruthy();
  });

  it('brings the page back once the navigation ends', async () => {
    renderBody();
    await act(async () => go({ region: 'main', shape: 'page' }));
    await act(async () => arrive());
    expect(await screen.findByText('The old page')).toBeTruthy();
  });

  // The wait is drawn in the destination's own frame, never centred down the window.
  describe('frames', () => {
    const frameOf = async (target: NavigationTarget) => {
      renderBody();
      await act(async () => go(target));
      return screen.getByRole('main');
    };

    it('draws a wide destination in the page column', async () => {
      const main = await frameOf({ region: 'main', shape: 'cards', frame: 'wide' });
      expect(main).toHaveClass('page-column');
      expect(main).not.toHaveClass('page-frame');
    });

    it('draws a narrow destination in the forms\x27 column', async () => {
      const main = await frameOf({ region: 'main', shape: 'page', frame: 'narrow' });
      expect(main).toHaveClass('page-frame', 'page-frame--narrow');
    });

    it('draws a menu page in the page column with its side menu', async () => {
      const main = await frameOf({ region: 'main', shape: 'page', frame: 'with-nav' });
      expect(main).toHaveClass('page-column');
      expect(main.querySelector('.skeleton__menu')).not.toBeNull();
    });

    it('draws an ingredient\x27s entry in the page column, with the entry\x27s own menu grid', async () => {
      const main = await frameOf({ region: 'main', shape: 'page', frame: 'entry' });
      expect(main).toHaveClass('page-column');
      expect(main.querySelector('.ingredient-entry--with-nav .skeleton__menu')).not.toBeNull();
      expect(main.querySelector('.page-with-nav')).toBeNull();
    });

    it('keeps the standard frame for a target that names none', async () => {
      const main = await frameOf({ region: 'main', shape: 'page' });
      expect(main).toHaveClass('page-frame');
      expect(main).not.toHaveClass('page-frame--narrow');
    });

    it('puts a narrow form on the panel the form sits on', async () => {
      const main = await frameOf({ region: 'main', shape: 'form', frame: 'narrow' });
      expect(main.querySelector('.panel .skeleton')).not.toBeNull();
    });

    it('keeps the landmark, the hidden heading and the one status', async () => {
      const main = await frameOf({ region: 'main', shape: 'page', frame: 'wide' });
      expect(within(main).getByRole('heading', { level: 1 })).toBeTruthy();
      expect(screen.getAllByRole('status')).toHaveLength(1);
    });
  });

  // The skeleton stays over the arrived page for the fade (M12.33), out of reach
  // of assistive technology and the pointer, and leaves with no layout of its own.
  describe('when the page arrives', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows the page at once, keeps the skeleton hidden over it, then drops it', async () => {
      const { container } = renderBody();
      await act(async () => go({ region: 'main', shape: 'page', frame: 'wide' }));
      await act(async () => arrive());

      expect(screen.getByText('The old page')).toBeTruthy();
      const overlay = container.querySelector('.skeleton-fade');
      expect(overlay?.getAttribute('aria-hidden')).toBe('true');
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.getAllByRole('main')).toHaveLength(1);
      expect(screen.queryByRole('heading', { level: 1 })).toBeNull();

      await act(async () => vi.advanceTimersByTime(200));
      expect(container.querySelector('.skeleton-fade')).toBeNull();
      expect(screen.getByText('The old page')).toBeTruthy();
    });

    it('has no skeleton to fade after a navigation that drew none', async () => {
      const { container } = renderBody();
      await act(async () => go());
      await act(async () => arrive());
      expect(container.querySelector('.skeleton-fade')).toBeNull();
    });
  });
});
