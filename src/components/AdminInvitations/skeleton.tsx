import type { ReactElement } from 'react';
import { ListBodySkeleton, ListFilterFrame } from '../ListFrame/skeleton';
import AdminInvitationsFilter from './filter';
import { NO_INVITATIONS_FILTER } from './href';
import './index.scss';

/** The list's rows with nothing in them yet: its table's headings over placeholder rows. */
export const AdminInvitationsBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Keeper Invitations"
    rowKind="keeper-invitations"
    tableClassName="data-table--nowrap"
    headings={['Email', 'Role', 'Reason', 'Expires', 'Revoke']}
    actions={['Revoke']}
    count={4}
  />
);

/** The keeper invitations list with nothing in it yet: its own filter row, unfiltered, over the placeholder rows. */
export const AdminInvitationsSkeleton = (): ReactElement => (
  <section className="admin-invitations" aria-label="Keeper Invitations">
    <ListFilterFrame filter={<AdminInvitationsFilter filter={NO_INVITATIONS_FILTER} />}>
      <AdminInvitationsBodySkeleton />
    </ListFilterFrame>
  </section>
);
