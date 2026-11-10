import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { currentHrefs, hrefs } from '../../../../support/links';

// The Invitations page: its heading and the row of its three tabs, each at its own address and current there
// (claude-docs/components/admin-nav.md). The tabs come from the Keepers nav's own list, so the nav and the row agree.

const pathname = vi.fn<() => string>();
vi.mock('next/navigation', async () => ({
  ...(await import('../../../../support/next-navigation')),
  usePathname: () => pathname(),
}));

const { default: InvitationsLayout } = await import('@/app/(shell)/keepers/(invitations)/layout');

const TABS = [
  ['Invitations', '/keepers/invitations'],
  ['Invitation Cards', '/keepers/invitation-cards'],
  ['Card Sign-Ups', '/keepers/card-sign-ups'],
] as const;

const tabRow = () => screen.getByRole('navigation', { name: 'Invitations' });

describe('the Invitations page’s tabs', () => {
  it('lists Invitations, Invitation Cards and Card Sign-Ups under the heading Invitations, and no people tab', () => {
    pathname.mockReturnValue('/keepers/invitations');

    render(<InvitationsLayout action={null}>{<p>The tab itself</p>}</InvitationsLayout>);

    expect(screen.getByRole('heading', { level: 1, name: 'Invitations' })).toBeInTheDocument();
    const links = within(tabRow()).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(TABS.map(([label]) => label));
    expect(hrefs(links)).toEqual(TABS.map(([, href]) => href));
    expect(screen.getByText('The tab itself')).toBeInTheDocument();
  });

  it.each(TABS)('marks %s current at its own address and no other tab', (_, href) => {
    pathname.mockReturnValue(href);

    render(<InvitationsLayout action={null}>{null}</InvitationsLayout>);

    expect(currentHrefs(within(tabRow()).getAllByRole('link'))).toEqual([href]);
  });
});
