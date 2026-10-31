import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pathname = vi.fn<() => string>();
const search = vi.fn<() => string>();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useSearchParams: () => new URLSearchParams(search()),
}));

const { default: SupportLink } = await import('@/components/SupportLink');

const link = () => screen.getByRole('link', { name: 'Support' });

beforeEach(() => {
  pathname.mockReturnValue('/coven/hearth/grimoire');
  search.mockReturnValue('');
});

describe('SupportLink', () => {
  it('links to the page it is on with the Support dialog asked for', () => {
    render(<SupportLink>Support</SupportLink>);
    expect(link()).toHaveAttribute('href', '/coven/hearth/grimoire?support=');
  });

  it('keeps the parameters the page already carries and drops a stale error code', () => {
    search.mockReturnValue('facet=moon&error=404');
    render(<SupportLink>Support</SupportLink>);
    expect(link()).toHaveAttribute('href', '/coven/hearth/grimoire?facet=moon&support=');
  });

  it('goes to the support page where no dialog is drawn', () => {
    render(<SupportLink plain>Support</SupportLink>);
    expect(link()).toHaveAttribute('href', '/support');
  });
});
