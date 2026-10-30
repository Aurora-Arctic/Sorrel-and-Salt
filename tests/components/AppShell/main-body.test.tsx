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

// The page under test hides nothing of its own, so anything hidden from
// assistive technology is the skeleton left over the arrived page.
const hiddenFrom = (container: HTMLElement): Element | null =>
  container.querySelector('[aria-hidden="true"]');

describe('MainBody', () => {
  it('shows the page at rest', () => {
    renderBody();
    expect(screen.getByText('The old page')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  // The page is held beneath the skeleton, not removed, so it is
  // proved out of reach rather than absent: inert, and its landmark hidden.
  it('puts the page out of reach under one status in a main landmark while a main navigation is pending', async () => {
    renderBody();
    await act(async () => go({ region: 'main', shape: 'page' }));
    expect(screen.getByText('The old page').closest('[inert]')).not.toBeNull();
    expect(screen.getAllByRole('main')).toHaveLength(1);
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

  // The frame each destination is drawn in is presentation, owned by the
  // workshop story; what stays is the landmark, its heading and the one status.
  it('keeps the landmark, the hidden heading and the one status in a framed wait', async () => {
    renderBody();
    await act(async () => go({ region: 'main', shape: 'page', frame: 'wide' }));
    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.getAllByRole('status')).toHaveLength(1);
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
      const { container } = renderBody();
      await act(async () => go({ region: 'main', shape: 'page', frame: 'wide' }));
      await act(async () => arrive());

      expect(screen.getByText('The old page')).toBeTruthy();
      expect(hiddenFrom(container)).not.toBeNull();
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.getAllByRole('main')).toHaveLength(1);
      expect(screen.queryByRole('heading', { level: 1 })).toBeNull();

      await act(async () => vi.advanceTimersByTime(200));
      expect(hiddenFrom(container)).toBeNull();
      expect(screen.getByText('The old page')).toBeTruthy();
    });

    it('has no skeleton to fade after a navigation that drew none', async () => {
      const { container } = renderBody();
      await act(async () => go());
      await act(async () => arrive());
      expect(hiddenFrom(container)).toBeNull();
    });
  });
});
