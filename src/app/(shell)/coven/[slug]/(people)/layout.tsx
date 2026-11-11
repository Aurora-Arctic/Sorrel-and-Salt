import type { ReactNode } from 'react';
import TabbedPage from '@/components/TabbedPage';
import { requireCovenMembership } from '@/lib/request-session';
import { covenAccessOf } from '@/lib/coven-access';
import type { CovenLayoutProps } from '../types';
import { peopleTabs } from './tabs';

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
  const { canInvite } = covenAccessOf(membership.role);
  const tabs = peopleTabs(slug, { invitations: canInvite });

  return (
    <TabbedPage title="Members" tabs={tabs} action={action}>
      {children}
    </TabbedPage>
  );
}
