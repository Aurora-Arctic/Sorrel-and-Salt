import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NotAuthorized from '@/components/NotAuthorized';
import { NotFoundScreen } from '@/components/ErrorScreens';

// claude-docs/components/error-page.md

vi.mock('next/navigation', async () => ({
  ...(await import('../../support/next-navigation')),
  usePathname: () => '/keepers',
}));
window.history.replaceState({}, '', '/keepers');

const linkTargets = () =>
  Object.fromEntries(
    ['Back to Sorrel & Salt', 'Help', 'Report This'].map((name) => [
      name,
      screen.getByRole('link', { name }).getAttribute('href'),
    ]),
  );

describe('NotAuthorized', () => {
  it('offers the same three links as the 404, to the same places', () => {
    const { unmount } = render(<NotFoundScreen />);
    const notFound = linkTargets();
    unmount();

    render(<NotAuthorized />);
    const forbidden = linkTargets();

    expect(forbidden['Back to Sorrel & Salt']).toBe('/');
    expect(forbidden['Help']).toBe('/help');
    expect(forbidden['Report This']).toContain('support=bug');
    expect(forbidden['Report This']).toContain('error=403');
    expect(forbidden['Report This']).toMatch(/^\/keepers\?/);
    expect(forbidden['Back to Sorrel & Salt']).toBe(notFound['Back to Sorrel & Salt']);
    expect(forbidden['Help']).toBe(notFound['Help']);
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  // Report This reports a fault in the page; it does not ask for access to it.
  it('names no keeper and offers no way to request access in its own text, though it can report a fault', () => {
    const { container } = render(<NotAuthorized />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/@|request|contact|ask/i);
  });

  it('titles the tab by its own heading', () => {
    render(<NotAuthorized />);

    expect(document.title).toBe(screen.getByRole('heading', { level: 1 }).textContent);
  });
});
