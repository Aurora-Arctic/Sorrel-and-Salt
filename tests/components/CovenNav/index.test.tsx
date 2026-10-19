import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The page the test pretends to be on; Next's own hook reads the App
// Router's state, which a component test does not mount.
const pathname = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => pathname() }));

const { default: CovenNav } = await import('@/components/CovenNav');

// The nav the `/coven/[slug]` layout carries (M9.15;
// claude-docs/components/coven-nav.md).
const SLUG = 'fixture-coven';

const nav = () => screen.getByRole('navigation', { name: 'Coven' });

describe('CovenNav', () => {
  beforeEach(() => {
    pathname.mockReturnValue(`/coven/${SLUG}`);
  });

  it('links the coven index, built from the slug', () => {
    render(<CovenNav slug={SLUG} canReadMembers />);
    const links = within(nav()).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toContain(`/coven/${SLUG}`);
  });

  it('marks the index current on the index', () => {
    render(<CovenNav slug={SLUG} canReadMembers />);
    const index = within(nav())
      .getAllByRole('link')
      .find((link) => link.getAttribute('href') === `/coven/${SLUG}`);
    expect(index).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark the index current on a page beneath it', () => {
    pathname.mockReturnValue(`/coven/${SLUG}/members`);
    render(<CovenNav slug={SLUG} canReadMembers />);
    const index = within(nav())
      .getAllByRole('link')
      .find((link) => link.getAttribute('href') === `/coven/${SLUG}`);
    expect(index).not.toHaveAttribute('aria-current');
  });

  it.each([true, false])('links the ingredients page, with canReadMembers %s', (canReadMembers) => {
    render(<CovenNav slug={SLUG} canReadMembers={canReadMembers} />);
    expect(within(nav()).getByRole('link', { name: 'Ingredients' })).toHaveAttribute(
      'href',
      `/coven/${SLUG}/ingredients`,
    );
  });

  it('marks ingredients current on a page beneath it, and the index not', () => {
    pathname.mockReturnValue(`/coven/${SLUG}/ingredients/some-id`);
    render(<CovenNav slug={SLUG} canReadMembers />);
    expect(within(nav()).getByRole('link', { name: 'Ingredients' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav()).getByRole('link', { name: 'Overview' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('links the members page for a caller who may read members', () => {
    render(<CovenNav slug={SLUG} canReadMembers />);
    expect(within(nav()).getByRole('link', { name: 'Members' })).toHaveAttribute(
      'href',
      `/coven/${SLUG}/members`,
    );
  });

  it('does not link the members page for a caller who may not, who would be answered with a 404', () => {
    render(<CovenNav slug={SLUG} canReadMembers={false} />);
    expect(within(nav()).queryByRole('link', { name: 'Members' })).not.toBeInTheDocument();
    // Why the absence is the permission's: the same nav, for one who may, has the link.
    render(<CovenNav slug={SLUG} canReadMembers />);
    expect(
      within(screen.getAllByRole('navigation', { name: 'Coven' })[1]).getByRole('link', {
        name: 'Members',
      }),
    ).toBeInTheDocument();
  });
});
