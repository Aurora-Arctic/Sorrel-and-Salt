import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NotAuthorized from '@/components/NotAuthorized';

// What a signed-in non-admin sees at `/admin` (M5.4): a refusal that says why,
// and nothing that names an admin or asks one for anything
// (claude-docs/components/not-authorized.md).

describe('NotAuthorized', () => {
  it('says the visitor is not authorized, as the page heading', () => {
    render(<NotAuthorized />);

    expect(screen.getByRole('heading', { level: 1, name: 'Not authorized' })).toBeInTheDocument();
  });

  it('explains that the account lacks admin rights', () => {
    render(<NotAuthorized />);

    expect(screen.getByText(/your account does not have admin rights/i)).toBeInTheDocument();
  });

  it('offers the way back to the front page and no other link', () => {
    render(<NotAuthorized />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('Back to Sorrel & Salt');
    expect(links[0]).toHaveAttribute('href', '/');
  });

  // Nothing to press and no one to write to: a request control or an address
  // would be a way to request access, and a name would say who the admins are.
  it('names no admin and offers no way to request access', () => {
    const { container } = render(<NotAuthorized />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/@|request|contact|ask/i);
  });
});
