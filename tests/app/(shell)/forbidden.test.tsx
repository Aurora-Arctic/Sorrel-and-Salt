import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ForbiddenPage from '@/app/(shell)/forbidden';

vi.mock('next/navigation', async () => ({
  ...(await import('../../support/next-navigation')),
  usePathname: () => '/keepers',
}));

// What `forbidden()` renders inside the shell (claude-docs/components/error-page.md, "Not Authorized"). The 403 and
// the 404 share one body, which may draw the `main` itself, so this holds the page to a single landmark.

describe('the shell’s forbidden page', () => {
  it('draws one main landmark holding the Not Authorized heading and the same three ways on as the 404', () => {
    render(<ForbiddenPage />);

    const mains = screen.getAllByRole('main');
    expect(mains).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Not Authorized' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Sorrel & Salt' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('link', { name: 'Help' })).toHaveAttribute('href', '/help');
    expect(screen.getByRole('link', { name: 'Report This' })).toBeInTheDocument();
  });
});
