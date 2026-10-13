import type { Route } from 'next';
import type { ReactNode } from 'react';
import TabbedPage from '../../../../../components/TabbedPage';
import type { PageTab } from '../../../../../components/TabbedPage/types';
import { requireCovenMembership } from '../../../../../lib/request-session';
import { rolePermits } from '@/modules/coven';
import type { CovenLayoutProps } from '../types';

// The coven's people: Members, the roll, and for an owner Invitations, the
// pending list (M7.6), as a tabbed page the way admin's People is
// (claude-docs/components/tabbed-page.md). The heading says "Members", as the
// nav item does (MB.119 decision d), though the tabs hold two lists. A factory-free layout rather than
// admin's `tabbedLayout`, since the tabs and the action depend on the viewer's
// role and the coven's slug. The role is decided by the permission, as
// everywhere (`member: invite`), never by catching a service's Forbidden.
// Invite is the heading line's action on both tabs, for an owner only, from
// the `@action` slot (`invite-action.tsx`) as admin's tab actions are. Each
// page still runs its own guard: a layout does not re-run on a tab press.
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
