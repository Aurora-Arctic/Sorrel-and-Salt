import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/coven/hearth',
  useSearchParams: () => new URLSearchParams(),
}));

const { SITE_TAGLINE } = await import('@/lib/site');
const { default: SiteFooter } = await import('@/components/SiteFooter');

describe('SiteFooter', () => {
  it('carries the Support icon link that opens the dialog over the page', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Footer' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      '/coven/hearth?support=',
    );
  });

  it('states what the site is and what its reference is not', () => {
    render(<SiteFooter />);
    expect(screen.getByText(SITE_TAGLINE)).toBeInTheDocument();
  });

  it('links the site name to the home page', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'Sorrel & Salt' })).toHaveAttribute('href', '/');
  });
});
