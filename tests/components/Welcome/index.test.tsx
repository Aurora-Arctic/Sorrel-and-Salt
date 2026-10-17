import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Welcome from '@/components/Welcome';

// The front door at `/`. What it says is the same for everyone; the one
// thing that changes with the session is the way in — a signed-in visitor
// is offered the landing, never sign-in again (claude-docs/components/welcome.md).

describe('Welcome', () => {
  it('offers a signed-out visitor the sign-in page', () => {
    render(<Welcome />);

    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/sign-in');
    expect(screen.queryByRole('link', { name: 'Continue' })).not.toBeInTheDocument();
  });

  it('offers a signed-in visitor the landing instead of asking them to sign in again', () => {
    render(<Welcome landing="/coven" />);

    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/coven');
    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
  });

  // The page passes the landing for the visitor's role; the component
  // continues to whichever it is given.
  it("continues to the landing it is given, an admin's included", () => {
    render(<Welcome landing="/admin" />);

    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/admin');
  });

  // The compendium is the one public surface (MB.80), so the front door
  // reaches it for everyone, whichever way in they are offered.
  it.each([
    ['a signed-out visitor', undefined],
    ['a signed-in visitor', '/coven' as const],
  ])('links %s to the compendium', (_, landing) => {
    render(<Welcome landing={landing} />);

    expect(screen.getByRole('link', { name: 'Browse the Compendium' })).toHaveAttribute(
      'href',
      '/compendium',
    );
  });
});
