import type { Route } from 'next';
import type { MemberDetailProps } from '../../../../../../components/MemberDetail/types';
import type { MemberListEntry } from '../../../../../../components/MemberList/types';
import type { ModalHeading } from '../../../../../../components/Modal/types';

export interface MembersPageProps {
  /** The cursor the list stands at, and the member whose modal is open over it. */
  searchParams: Promise<{
    after?: string | string[];
    before?: string | string[];
    member?: string | string[];
  }>;
}

/** The member `?member=` opens, from the rows the page read: the modal's head and the row. */
export interface OpenedMember {
  heading: ModalHeading;
  member: MemberListEntry;
}

export interface MemberDialogProps extends Pick<
  MemberDetailProps,
  'workspaceId' | 'currentUserId' | 'canChangeRoles' | 'canPause' | 'canRemove'
> {
  /** The list the modal opened over, its cursor kept: closing returns there. */
  closeHref: Route;
  /** What the address opens; none when it opens nothing, or while a press's is on its way. */
  opened?: OpenedMember;
}
