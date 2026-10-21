import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicFrame from '@/components/PublicFrame';

const pathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => pathname() }));

// The frame round a public page for a signed-out visitor (MB.83): the
// landmarks, the skip link that reaches the page, and the way in.

const frame = () =>
  render(
    <PublicFrame>
      <h1>The page</h1>
    </PublicFrame>,
  );

const compendiumLink = () =>
  within(screen.getByRole('navigation', { name: 'Site' })).getByRole('link', {
    name: 'Compendium',
  });

describe('PublicFrame', () => {
  beforeEach(() => {
    pathname.mockReturnValue('/compendium');
  });

  it('holds the page in main#main, which the skip link names', () => {
    frame();

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main');
    expect(within(main).getByRole('heading', { name: 'The page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to Content' })).toHaveAttribute('href', '#main');
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

  it('marks no page as current anywhere else, nor on a path that only begins with its letters', () => {
    for (const path of ['/', '/compendium-archive']) {
      pathname.mockReturnValue(path);
      const { unmount } = frame();

      expect(compendiumLink()).not.toHaveAttribute('aria-current');
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
