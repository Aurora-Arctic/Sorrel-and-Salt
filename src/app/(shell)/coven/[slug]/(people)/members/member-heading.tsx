import type { ModalHeading } from '@/components/Modal/types';
import type { MemberListEntry } from '@/components/MemberList/types';

/**
 * The member modal's head: what it is, then whom, then their address where the page read one. Built for both the row's
 * link and the loaded modal so the head stays (claude-docs/components/modal.md, "Opening at once").
 */
export function memberHeading({
  name,
  email,
}: Pick<MemberListEntry, 'name' | 'email'>): ModalHeading {
  return {
    eyebrow: 'Member',
    title: name,
    qualifier: email ? <span className="member-list__modal-email">{email}</span> : undefined,
  };
}
