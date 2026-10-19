import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Navigating } from '../../support/navigating';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/here' }));

const { usePendingNavigation } = await import('@/lib/navigation');
const { default: MainBody } = await import('@/components/AppShell/main-body');

// While a navigation aimed at the main region is on its way, the page gives
// way to one status inside a main landmark; any other navigation leaves it.

let arrive = () => {};
let go: (target?: { region: 'coven' | 'main'; shape: 'page' | 'table' }) => void = () => {};

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
});
