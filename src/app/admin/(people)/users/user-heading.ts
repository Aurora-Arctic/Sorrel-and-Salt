import type { ModalHeading } from '../../../../components/Modal/types';
import type { UserListEntry } from '../../../../components/UserList/types';

/**
 * The user modal's head (M9.19): what it is, then whom, by name and address,
 * as the row names them. Built by the page for each row's link and for the
 * loaded modal alike, so the head a press shows at once is the one that
 * stays when the covens arrive (claude-docs/components/modal.md, "Opening at
 * once").
 */
export function userHeading({ name, email }: Pick<UserListEntry, 'name' | 'email'>): ModalHeading {
  return { eyebrow: 'User', title: name, qualifier: email };
}
