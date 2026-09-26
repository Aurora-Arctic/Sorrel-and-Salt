import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Welcome from '@/components/Welcome';

// The front door at `/`. What it says is the same for everyone; the one
// thing that changes with the session is the way in — a signed-in visitor
// is offered the landing, never sign-in again (claude-docs/components/welcome.md).

describe('Welcome', () => {
  it('names the site and says what it is', () => {
    render(<Welcome signedIn={false} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Sorrel & Salt' })).toBeInTheDocument();
    expect(screen.getByText(/grimoire/i)).toBeInTheDocument();
  });

  it('says plainly that the site is invite-only, and how to get in', () => {
    render(<Welcome signedIn={false} />);

    expect(screen.getByText(/invite-only/i)).toBeInTheDocument();
    expect(screen.getByText(/invitation from someone who already uses it/i)).toBeInTheDocument();
  });

  it('offers a signed-out visitor the sign-in page', () => {
    render(<Welcome signedIn={false} />);

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
    expect(screen.queryByRole('link', { name: 'Continue' })).not.toBeInTheDocument();
  });

  it('offers a signed-in visitor the landing instead of asking them to sign in again', () => {
    render(<Welcome signedIn />);

    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/coven');
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
  });

  it('keeps the same introduction for a signed-in visitor', () => {
    render(<Welcome signedIn />);

    expect(screen.getByRole('heading', { level: 1, name: 'Sorrel & Salt' })).toBeInTheDocument();
    expect(screen.getByText(/invite-only/i)).toBeInTheDocument();
  });
});
