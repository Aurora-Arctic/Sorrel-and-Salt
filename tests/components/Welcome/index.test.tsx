import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Welcome from '@/components/Welcome';

// The front door at `/`. What it says is the same for everyone; the one
// thing that changes with the session is the way in — a signed-in visitor
// is offered the landing, never sign-in again (claude-docs/components/welcome.md).

describe('Welcome', () => {
  it('names the site and says what it is', () => {
    render(<Welcome />);

    expect(screen.getByRole('heading', { level: 1, name: 'Sorrel & Salt' })).toBeInTheDocument();
    expect(screen.getByText(/grimoire/i)).toBeInTheDocument();
  });

  it('says plainly that the site is invite-only, and how to get in', () => {
    render(<Welcome />);

    expect(screen.getByText(/invite-only/i)).toBeInTheDocument();
    expect(screen.getByText(/invitation from someone who already uses it/i)).toBeInTheDocument();
  });

  it('offers a signed-out visitor the sign-in page', () => {
    render(<Welcome />);

    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/sign-in');
    expect(screen.queryByRole('link', { name: 'Continue' })).not.toBeInTheDocument();
  });

  it('offers a signed-in visitor the landing instead of asking them to sign in again', () => {
    render(<Welcome landing="/coven" />);

    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/coven');
    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
  });

  // The page passes the landing for the visitor's role; the component
  // continues to whichever it is given.
  it("continues to the landing it is given, an admin's included", () => {
    render(<Welcome landing="/admin" />);

    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/admin');
  });

  it('keeps the same introduction for a signed-in visitor', () => {
    render(<Welcome landing="/coven" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Sorrel & Salt' })).toBeInTheDocument();
    expect(screen.getByText(/invite-only/i)).toBeInTheDocument();
  });
});
