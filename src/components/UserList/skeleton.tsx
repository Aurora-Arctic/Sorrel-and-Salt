import type { ReactElement } from 'react';
import { ListBodySkeleton } from '../ListFrame/skeleton';

/** The list's rows with nothing in them yet: its table's headings over placeholder rows. */
export const UserListBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Users"
    headings={[
      'Name',
      'Email',
      'Role',
      'Can Create',
      'Support',
      'Access',
      'Logins',
      'Terms',
      'Signed Up',
      'Impersonate',
    ]}
    actions={['Impersonate']}
  />
);
