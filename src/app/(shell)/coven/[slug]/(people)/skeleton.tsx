'use client';

import type { ReactElement, ReactNode } from 'react';
import ListFrame from '@/components/ListFrame';
import { SoleStewardNotice } from './sole-steward-notice';
import TabbedPage from '@/components/TabbedPage';
import type { PageTab } from '@/components/TabbedPage/types';
import { ButtonFace } from '@/components/ActionFace';
import { MemberListBodySkeleton } from '@/components/MemberList/skeleton';
import { PendingInvitationsBodySkeleton } from '@/components/PendingInvitations/skeleton';
import { useCovenSlug } from '@/lib/use-coven-slug';
import { covenPath } from '@/lib/coven-path';

/** The Members tab's list: the table's headings over placeholder rows. */
export const MembersPanelSkeleton = (): ReactElement => (
  <ListFrame disabled>
    <SoleStewardNotice />
    <MemberListBodySkeleton />
  </ListFrame>
);

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
      href: covenPath(slug, 'members'),
      label: 'Members',
      skeleton: <MembersPanelSkeleton />,
    },
    {
      href: covenPath(slug, 'invitations'),
      label: 'Invitations',
      skeleton: <InvitationsPanelSkeleton />,
    },
  ];
  return (
    <TabbedPage
      as="div"
      title="Members"
      tabs={tabs}
      open={covenPath(slug, open)}
      action={<ButtonFace>Invite</ButtonFace>}
    >
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
