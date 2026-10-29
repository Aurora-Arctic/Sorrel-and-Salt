import type { Route } from 'next';
import type { ReactNode } from 'react';
import TabbedPage from '../../../../../components/TabbedPage';
import type { PageTab } from '../../../../../components/TabbedPage/types';
import { requireCovenMembership } from '../../../../../lib/request-session';
import { rolePermits } from '@/modules/coven';
import type { CovenLayoutProps } from '../types';

// The coven's people: Members, the roll, and for an owner Invitations, as a tabbed page the way
// admin's People is (claude-docs/components/tabbed-page.md). The heading says "Members", as the nav
// item does. Not admin's `tabbedLayout`, since the tabs and action depend on the viewer's role and
// the coven's slug; the role is decided by the permission (`member: invite`), never by catching
// Forbidden. Each page runs its own guard, as a layout does not re-run on a tab press.
export default async function PeopleLayout({
  children,
  action,
  params,
}: CovenLayoutProps & { action: ReactNode }) {
  const { slug } = await params;
  const { membership } = await requireCovenMembership(slug);
  const canInvite = rolePermits(membership.role, { member: ['invite'] });
  const tabs: PageTab[] = [
    { href: `/coven/${slug}/members` as Route, label: 'Members' },
    ...(canInvite ? [{ href: `/coven/${slug}/invitations` as Route, label: 'Invitations' }] : []),
  ];

  return (
    <TabbedPage title="Members" tabs={tabs} action={action}>
      {children}
    </TabbedPage>
  );
}
