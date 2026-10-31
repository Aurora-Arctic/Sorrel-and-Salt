import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/coven/hearth',
  useSearchParams: () => new URLSearchParams(),
}));

const { default: SiteFooter } = await import('@/components/SiteFooter');

describe('SiteFooter', () => {
  it('carries one Support link that opens the dialog over the page in the shell', () => {
    render(<SiteFooter inShell />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Footer' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      '/coven/hearth?support=',
    );
  });

  it('links to the support page in the public frame, which has no dialog', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support');
  });
});
