'use client';

import type { ReactNode } from 'react';
import TabbedPage from '@/components/TabbedPage';
import { ButtonFace } from '@/components/ActionFace';
import { InvitationsPanelSkeleton, MembersPanelSkeleton } from './panels';
import { peopleTabs } from './tabs';
import { useCovenSlug } from '@/lib/use-coven-slug';
import { covenPath } from '@/lib/coven-path';

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
  const tabs = peopleTabs(slug, { invitations: true });
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
