import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { currentHrefs, hrefs } from '../../../../support/links';

// The People page: its heading and the row of its two tabs, each at its own address and current there. The
// invitation tabs moved to their own page (tests/app/(shell)/keepers/(invitations)/layout.test.tsx).

const pathname = vi.fn<() => string>();
vi.mock('next/navigation', async () => ({
  ...(await import('../../../../support/next-navigation')),
  usePathname: () => pathname(),
}));

const { default: PeopleLayout } = await import('@/app/(shell)/keepers/(people)/layout');

const TABS = [
  ['Users', '/keepers/users'],
  ['Privilege Changes', '/keepers/privilege-changes'],
] as const;

const tabRow = () => screen.getByRole('navigation', { name: 'People' });

describe('the People page’s tabs', () => {
  it('lists Users and Privilege Changes under the heading People, and no invitation tab', () => {
    pathname.mockReturnValue('/keepers/users');

    render(<PeopleLayout action={null}>{<p>The tab itself</p>}</PeopleLayout>);

    expect(screen.getByRole('heading', { level: 1, name: 'People' })).toBeInTheDocument();
    const links = within(tabRow()).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(TABS.map(([label]) => label));
    expect(hrefs(links)).toEqual(TABS.map(([, href]) => href));
    expect(screen.getByText('The tab itself')).toBeInTheDocument();
  });

  it.each(TABS)('marks %s current at its own address and no other tab', (_, href) => {
    pathname.mockReturnValue(href);

    render(<PeopleLayout action={null}>{null}</PeopleLayout>);

    expect(currentHrefs(within(tabRow()).getAllByRole('link'))).toEqual([href]);
  });
});
