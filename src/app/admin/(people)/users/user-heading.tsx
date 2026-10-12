import type { ModalHeading } from '../../../../components/Modal/types';
import type { UserListEntry } from '../../../../components/UserList/types';

/**
 * The user modal's head (M9.19): what it is, then whom, by name and address,
 * as the row names them. Built by the page for each row's link and for the
 * loaded modal alike, so the head a press shows at once is the one that
 * stays when the covens arrive (claude-docs/components/modal.md, "Opening at
 * once"). The address is a span of the users list's own, so it sits on a line
 * beneath the name without the shared Modal changing for one caller.
 */
export function userHeading({ name, email }: Pick<UserListEntry, 'name' | 'email'>): ModalHeading {
  return {
    eyebrow: 'User',
    title: name,
    qualifier: <span className="user-list__modal-email">{email}</span>,
  };
}
