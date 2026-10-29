import type { ModalHeading } from '../../../../../components/Modal/types';
import type { UserListEntry } from '../../../../../components/UserList/types';

/**
 * The user modal's head: what it is, then whom. Built for both the row's link and the loaded
 * modal so the head stays (claude-docs/components/modal.md, "Opening at once").
 */
export function userHeading({ name, email }: Pick<UserListEntry, 'name' | 'email'>): ModalHeading {
  return {
    eyebrow: 'User',
    title: name,
    qualifier: <span className="user-list__modal-email">{email}</span>,
  };
}
