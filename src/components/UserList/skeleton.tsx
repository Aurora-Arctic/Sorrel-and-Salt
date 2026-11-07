import type { ReactElement } from 'react';
import { ListBodySkeleton, ListFilterFrame } from '../ListFrame/skeleton';
import UserListFilter from './filter';

/** The list's rows with nothing in them yet: its table's headings over placeholder rows. */
export const UserListBodySkeleton = ({
  canImpersonate = false,
}: {
  /** Whether the page draws its Impersonate column (the same flag the page reads). */
  canImpersonate?: boolean;
}): ReactElement => (
  <ListBodySkeleton
    label="Users"
    rowKind="users"
    tableClassName="data-table--roomy data-table--nowrap"
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
      ...(canImpersonate ? ['Impersonate'] : []),
    ]}
    actions={['Impersonate']}
  />
);

/** The user list with nothing in it yet: its own filter row, unfiltered, over the placeholder rows. */
export const UserListSkeleton = ({
  canImpersonate = false,
}: {
  canImpersonate?: boolean;
}): ReactElement => (
  <ListFilterFrame
    className="user-list"
    filter={<UserListFilter query="" awaitingApproval={false} />}
  >
    <UserListBodySkeleton canImpersonate={canImpersonate} />
  </ListFilterFrame>
);
