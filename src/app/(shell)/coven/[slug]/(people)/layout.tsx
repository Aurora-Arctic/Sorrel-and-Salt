import type { ReactNode } from 'react';
import TabbedPage from '@/components/TabbedPage';
import type { PageTab } from '@/components/TabbedPage/types';
import { requireCovenMembership } from '@/lib/request-session';
import { covenAccessOf } from '@/lib/coven-access';
import type { CovenLayoutProps } from '../types';
import { InvitationsPanelSkeleton, MembersPanelSkeleton } from './skeleton';
import { covenPath } from '@/lib/coven-path';

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
  const tabs: PageTab[] = [
    {
      href: covenPath(slug, 'members'),
      label: 'Members',
      skeleton: <MembersPanelSkeleton />,
    },
    ...(canInvite
      ? [
          {
            href: covenPath(slug, 'invitations'),
            label: 'Invitations',
            skeleton: <InvitationsPanelSkeleton />,
          },
        ]
      : []),
  ];

  return (
    <TabbedPage title="Members" tabs={tabs} action={action}>
      {children}
    </TabbedPage>
  );
}
