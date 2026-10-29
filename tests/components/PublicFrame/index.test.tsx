import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicFrame from '@/components/PublicFrame';
import { Navigating } from '../../support/navigating';

const pathname = vi.fn<() => string>();
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname(), useRouter: () => router }));

// The frame round a public page for a signed-out visitor: the landmarks, the skip link that reaches the page, the way in, and the wait a move between public pages draws.
// The page brings its own `main`, as the (public) layout gives it one.

const frame = () =>
  render(
    <Navigating push={router.push}>
      <PublicFrame>
        <main>
          <h1>The page</h1>
        </main>
      </PublicFrame>
    </Navigating>,
  );

const compendiumLink = () =>
  within(screen.getByRole('navigation', { name: 'Site' })).getByRole('link', {
    name: 'Compendium',
  });

describe('PublicFrame', () => {
  beforeEach(() => {
    pathname.mockReturnValue('/compendium');
  });

  it('holds the page just after the empty target the skip link names', () => {
    frame();

    const skip = screen.getByRole('link', { name: 'Skip to Content' });
    const target = document.getElementById(skip.getAttribute('href')?.slice(1) ?? '');
    // Focusable by script only, and wrapping nothing, so a click on the page
    // never lands on it.
    expect(target).toHaveAttribute('tabindex', '-1');
    expect(target).toBeEmptyDOMElement();
    expect(target!.nextElementSibling).toContainElement(screen.getByRole('main'));
    expect(
      within(screen.getByRole('main')).getByRole('heading', { name: 'The page' }),
    ).toBeInTheDocument();
  });

  it('swaps the page for one status in one main under the bar, when the Compendium link is pressed', async () => {
    pathname.mockReturnValue('/compendium/ingredients/testwort');
    frame();
    // Why the page could have stayed: nothing is on its way yet.
    expect(screen.queryByRole('status')).toBeNull();

    await act(async () => fireEvent.click(compendiumLink()));

    expect(screen.queryByRole('heading', { name: 'The page' })).toBeNull();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(within(screen.getByRole('main')).getAllByRole('status')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('banner')).toContainElement(compendiumLink());
    expect(compendiumLink()).toHaveAttribute('aria-busy', 'true');
  });

  it('puts the skip link before everything else', () => {
    const { container } = frame();

    expect(container.querySelector('a')).toBe(
      screen.getByRole('link', { name: 'Skip to Content' }),
    );
  });

  it('offers the way in, and the Compendium in the site nav', () => {
    frame();

    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/sign-in');
    expect(
      within(screen.getByRole('navigation', { name: 'Site' })).getByRole('link', {
        name: 'Compendium',
      }),
    ).toHaveAttribute('href', '/compendium');
    expect(screen.getByRole('banner')).toContainElement(
      screen.getByRole('link', { name: 'Sorrel & Salt' }),
    );
  });

  it('marks the Compendium link as the current page on and beneath /compendium', () => {
    for (const path of ['/compendium', '/compendium/ingredients/testwort']) {
      pathname.mockReturnValue(path);
      const { unmount } = frame();

      expect(compendiumLink()).toHaveAttribute('aria-current', 'page');
      unmount();
    }
  });

  it('offers nothing workspace-shaped', () => {
    frame();

    for (const name of ['Your Coven', 'Admin', 'Add Ingredient']) {
      expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });
});
