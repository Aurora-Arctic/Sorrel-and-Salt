import type { Route } from 'next';
import type { MemberDetailProps } from '@/components/MemberDetail/types';
import type { MemberListEntry } from '@/components/MemberList/types';
import type { ModalHeading } from '@/components/Modal/types';

export interface MembersPageProps {
  searchParams: Promise<{
    after?: string | string[];
    before?: string | string[];
    member?: string | string[];
  }>;
}

export interface OpenedMember {
  heading: ModalHeading;
  member: MemberListEntry;
}

export interface MemberDialogProps extends Pick<
  MemberDetailProps,
  'workspaceId' | 'currentUserId' | 'canChangeRoles' | 'canPause' | 'canRemove'
> {
  closeHref: Route;
  /** What the address opens; none when it opens nothing, or while a press's is on its way. */
  opened?: OpenedMember;
}
