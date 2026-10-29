import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ErrorPage from '@/components/ErrorPage';

// The shared body of the 404 and 500 screens: a heading, a reason
// and the way onward, never an error's own text (claude-docs/components/error-page.md).

describe('ErrorPage', () => {
  it('renders the way onward it is given', () => {
    render(
      <ErrorPage title="Gone" reason="Nothing here.">
        <a href="/">Home</a>
      </ErrorPage>,
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Gone' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it('shows a reference only when given one', () => {
    const { rerender } = render(
      <ErrorPage title="Gone" reason="Nothing here.">
        <a href="/">Home</a>
      </ErrorPage>,
    );
    expect(screen.queryByText(/abc123/)).not.toBeInTheDocument();

    rerender(
      <ErrorPage title="Gone" reason="Nothing here." reference="abc123">
        <a href="/">Home</a>
      </ErrorPage>,
    );
    expect(screen.getByText(/abc123/)).toBeInTheDocument();
  });
});
