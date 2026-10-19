import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ShellViewer } from '@/lib/types';
import { Navigating } from '../../support/navigating';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/coven/fixture-coven',
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/auth-client', () => ({ signOut: vi.fn() }));

const { default: AppShell } = await import('@/components/AppShell');

// The text links in the bar and the account menu show the pending dot while
// their navigation is pending; the brand does not (M12.33).

const ADMIN: ShellViewer = {
  name: 'Fixture Admin',
  canCurate: true,
  canCreate: false,
  verified: true,
  pendingInvitations: 0,
};

let arrive = () => {};
afterEach(async () => {
  await act(async () => arrive());
});

function renderShell() {
  const arrives = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  return render(
    <Navigating push={router.push} arrives={arrives}>
      <AppShell viewer={ADMIN} workspaces={[]}>
        <main>The page</main>
      </AppShell>
    </Navigating>,
  );
}

const hintOf = (link: HTMLElement) => link.querySelector('.link-hint');

async function press(link: HTMLElement) {
  await act(async () => {
    fireEvent.click(link, { button: 0 });
  });
}

describe('AppShell pending hints', () => {
  it('shows the dot on a site nav link while its navigation is pending, and on no other', async () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Site' });
    const admin = within(nav).getByRole('link', { name: 'Admin' });
    expect(hintOf(admin)).not.toBeNull();
    expect(hintOf(admin)).not.toHaveClass('is-pending');

    await press(admin);

    expect(admin).toHaveAttribute('aria-busy', 'true');
    expect(hintOf(admin)).toHaveClass('is-pending');
    for (const other of within(nav).getAllByRole('link')) {
      if (other !== admin) expect(hintOf(other)).not.toHaveClass('is-pending');
    }
  });

  it('shows the dot on an account menu link while its navigation is pending', async () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: /^Fixture Admin/ }));
    const account = screen.getByRole('link', { name: 'Your Account' });
    expect(hintOf(account)).not.toBeNull();

    await press(account);

    expect(hintOf(account)).toHaveClass('is-pending');
  });

  it('draws no dot on the brand link', () => {
    renderShell();
    const brand = screen.getAllByRole('link').find((l) => l.classList.contains('app-shell__brand'));

    expect(brand).toBeDefined();
    expect(hintOf(brand as HTMLElement)).toBeNull();
  });
});
