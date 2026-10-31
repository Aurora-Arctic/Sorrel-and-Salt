import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SupportPanel from '@/components/SupportPanel';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

describe('SupportPanel', () => {
  it('offers a signed-out visitor Sign In, returning here, and no form', () => {
    render(<SupportPanel state={{ kind: 'signed-out' }} path="/support" />);
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute(
      'href',
      '/sign-in?next=%2Fsupport',
    );
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('tells a timed-out sender when it ends, in place of the form', () => {
    render(
      <SupportPanel
        state={{ kind: 'timed-out', until: new Date('2030-01-02T03:04:00Z') }}
        path="/support"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/2030/);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('shows the form to a sender who may write, with the kind and error asked for', () => {
    render(<SupportPanel state={{ kind: 'form', support: 'bug', errorCode: 404 }} path="/gone" />);
    expect(screen.getByRole('textbox', { name: /Subject/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Bug/ })).toBeChecked();
    expect(screen.getByText(/Error 404/)).toBeInTheDocument();
    expect(screen.getByText('/gone')).toBeInTheDocument();
  });
});
