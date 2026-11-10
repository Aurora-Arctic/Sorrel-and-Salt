import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', async () => ({
  ...(await import('../../support/next-navigation')),
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
    expect(screen.getAllByRole('link')).toHaveLength(8);
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      '/coven/hearth?support=',
    );
  });

  it('states what the site is and what its reference is not', () => {
    render(<SiteFooter />);
    expect(screen.getByText(SITE_TAGLINE)).toBeInTheDocument();
  });

  it('links to the privacy policy, a page a signed-out visitor may read', () => {
    render(<SiteFooter />);
    expect(
      within(screen.getByRole('navigation', { name: 'Footer' })).getByRole('link', {
        name: 'Privacy',
      }),
    ).toHaveAttribute('href', '/privacy');
  });

  it('links to the help pages, which a signed-out visitor may read', () => {
    render(<SiteFooter />);
    expect(
      within(screen.getByRole('navigation', { name: 'Footer' })).getByRole('link', {
        name: 'Help',
      }),
    ).toHaveAttribute('href', '/help');
  });

  it('links to the disclaimer', () => {
    render(<SiteFooter />);
    expect(
      within(screen.getByRole('navigation', { name: 'Footer' })).getByRole('link', {
        name: 'Disclaimer',
      }),
    ).toHaveAttribute('href', '/disclaimer');
  });

  it('links to the About Us page', () => {
    render(<SiteFooter />);
    expect(
      within(screen.getByRole('navigation', { name: 'Footer' })).getByRole('link', {
        name: 'About Us',
      }),
    ).toHaveAttribute('href', '/about');
  });

  it('links to the terms of use', () => {
    render(<SiteFooter />);
    expect(
      within(screen.getByRole('navigation', { name: 'Footer' })).getByRole('link', {
        name: 'Terms',
      }),
    ).toHaveAttribute('href', '/terms');
  });

  it('links to the code of ethics', () => {
    render(<SiteFooter />);
    expect(
      within(screen.getByRole('navigation', { name: 'Footer' })).getByRole('link', {
        name: 'Code of Ethics',
      }),
    ).toHaveAttribute('href', '/code-of-ethics');
  });

  it('links the site name to the home page', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'Sorrel & Salt' })).toHaveAttribute('href', '/');
  });
});
