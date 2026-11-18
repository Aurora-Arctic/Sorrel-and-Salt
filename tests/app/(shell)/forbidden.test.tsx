import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ForbiddenPage from '@/app/(shell)/forbidden';

// What `forbidden()` renders inside the shell (claude-docs/components/error-page.md, "Not Authorized"). The 403 and
// the 404 share one body, which may draw the `main` itself, so this holds the page to a single landmark.

describe('the shell’s forbidden page', () => {
  it('draws one main landmark holding the Not Authorized heading and a way back', () => {
    render(<ForbiddenPage />);

    const mains = screen.getAllByRole('main');
    expect(mains).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Not Authorized' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Sorrel & Salt' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
