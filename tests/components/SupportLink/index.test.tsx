import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pathname = vi.fn<() => string>();
const search = vi.fn<() => string>();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useSearchParams: () => new URLSearchParams(search()),
}));

// Captures the props `next/link` is given: a scroll to the top is not in the markup.
const linkScroll = vi.hoisted(() => vi.fn());
vi.mock('next/link', () => ({
  default: ({
    scroll,
    href,
    children,
    ...rest
  }: {
    scroll?: boolean;
    href: string;
    children: unknown;
  }) => {
    linkScroll(scroll);
    return (
      <a href={href} {...rest}>
        {children as never}
      </a>
    );
  },
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

  it('asks for the Support dialog with the topic chosen', () => {
    render(<SupportLink about="privacy">Support</SupportLink>);
    expect(link()).toHaveAttribute('href', '/coven/hearth/grimoire?support=privacy');
  });

  // Every page links to a copy of itself with the dialog asked for, and robots.txt blocks the home
  // page's copy, `/?support=`: a crawler that followed it would report the blocked link.
  it('asks a crawler not to follow it', () => {
    pathname.mockReturnValue('/');
    render(<SupportLink>Support</SupportLink>);
    expect(link()).toHaveAttribute('href', '/?support=');
    expect(link()).toHaveAttribute('rel', 'nofollow');
  });

  it('asks a crawler not to follow it before the address is known, too', () => {
    // The address hooks suspending leaves the fallback, the support page's own address.
    pathname.mockImplementation(() => {
      throw new Promise(() => {});
    });
    render(<SupportLink>Support</SupportLink>);
    expect(link()).toHaveAttribute('href', '/support');
    expect(link()).toHaveAttribute('rel', 'nofollow');
  });

  it('opens the dialog without scrolling the page to the top', () => {
    render(<SupportLink>Support</SupportLink>);
    expect(linkScroll).toHaveBeenCalledWith(false);
    expect(linkScroll).not.toHaveBeenCalledWith(undefined);
  });
});
