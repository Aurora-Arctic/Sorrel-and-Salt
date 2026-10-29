import type { Route } from 'next';
import type { ReactNode } from 'react';
import TabbedPage from '../../../../../components/TabbedPage';
import type { PageTab } from '../../../../../components/TabbedPage/types';
import { requireCovenMembership } from '../../../../../lib/request-session';
import { rolePermits } from '@/modules/coven';
import type { CovenLayoutProps } from '../types';

// The coven's people as a tabbed page (claude-docs/components/tabbed-page.md). Not admin's
// `tabbedLayout`, as the tabs depend on the role and slug; the role is decided by the permission
// (`member: invite`), never by catching Forbidden. Each page runs its own guard.
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
