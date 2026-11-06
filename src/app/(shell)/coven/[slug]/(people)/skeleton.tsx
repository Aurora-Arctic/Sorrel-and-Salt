'use client';

import type { Route } from 'next';
import type { ReactNode } from 'react';
import TabbedPage from '@/components/TabbedPage';
import type { PageTab } from '@/components/TabbedPage/types';
import { MemberListBodySkeleton } from '@/components/MemberList/skeleton';
import { PendingInvitationsBodySkeleton } from '@/components/PendingInvitations/skeleton';
import { useCovenSlug } from '@/lib/use-coven-slug';

/** The Members tab's list: the table's headings over placeholder rows. */
export const MembersPanelSkeleton = MemberListBodySkeleton;

/** The Invitations tab's list. */
export const InvitationsPanelSkeleton = PendingInvitationsBodySkeleton;

// The people page with the tab pressed open. Both tabs are drawn: the viewer's role is not known yet,
// and a steward's row is the longer.
const PeopleSkeleton = ({
  open,
  children,
}: {
  open: 'members' | 'invitations';
  children: ReactNode;
}) => {
  const slug = useCovenSlug();
  const tabs: PageTab[] = [
    {
      href: `/coven/${slug}/members` as Route,
      label: 'Members',
      skeleton: <MembersPanelSkeleton />,
    },
    {
      href: `/coven/${slug}/invitations` as Route,
      label: 'Invitations',
      skeleton: <InvitationsPanelSkeleton />,
    },
  ];
  return (
    <TabbedPage as="div" title="Members" tabs={tabs} open={`/coven/${slug}/${open}`}>
      {children}
    </TabbedPage>
  );
};

export const MembersSkeleton = () => (
  <PeopleSkeleton open="members">
    <MembersPanelSkeleton />
  </PeopleSkeleton>
);

export const InvitationsSkeleton = () => (
  <PeopleSkeleton open="invitations">
    <InvitationsPanelSkeleton />
  </PeopleSkeleton>
);
