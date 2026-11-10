'use client';

import type { ReactElement } from 'react';
import ListFrame from '@/components/ListFrame';
import { MemberListBodySkeleton } from '@/components/MemberList/skeleton';
import { PendingInvitationsBodySkeleton } from '@/components/PendingInvitations/skeleton';
import { SoleStewardNotice } from './sole-steward-notice';

/** The Members tab's list: the table's headings over placeholder rows. */
export const MembersPanelSkeleton = (): ReactElement => (
  <ListFrame disabled>
    <SoleStewardNotice />
    <MemberListBodySkeleton />
  </ListFrame>
);

/** The Invitations tab's list. */
export const InvitationsPanelSkeleton = PendingInvitationsBodySkeleton;
