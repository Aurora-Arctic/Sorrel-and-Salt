import type { ReactElement } from 'react';
import StackTable from '../DataTable';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import { workspaceRoleLabel } from '../UserDetail/roles';
import { emptyList } from '../../lib/text';
import { inUtc } from '../../lib/utc';
import RemoveControl from './remove-control';
import RevokeControl from './revoke-control';
import type { PendingInvitationsProps } from './types';
import './index.scss';

// The invitations an owner has sent and nobody has accepted, under the members roll: address, role
// and status, newest first, with its own pager. A pending one shows its expiry and offers Revoke; a
// declined one shows when, and offers Remove. The page draws it for owners only; nothing here
// decides who may see it (claude-docs/components/pending-invitations.md).

const PendingInvitations = ({
  workspaceId,
  invitations,
  previousHref,
  nextHref,
  position,
}: PendingInvitationsProps): ReactElement => (
  <ListFrame>
    <ListBody>
      <StackTable
        aria-label="Pending Invitations"
        columns={[
          { heading: 'Email', cell: (invitation) => invitation.email },
          { heading: 'Role', cell: (invitation) => workspaceRoleLabel(invitation.role) },
          {
            heading: 'Status',
            cell: ({ declinedAt, expiresAt }) =>
              declinedAt ? (
                <>
                  <span className="pending-invitations__declined">Declined</span>
                  <time dateTime={declinedAt.toISOString()}>{inUtc(declinedAt)}</time>
                </>
              ) : (
                <>
                  Expires <time dateTime={expiresAt.toISOString()}>{inUtc(expiresAt)}</time>
                </>
              ),
          },
          {
            heading: 'Action',
            action: 'foot',
            cell: (invitation) =>
              invitation.declinedAt ? (
                <RemoveControl workspaceId={workspaceId} invitation={invitation} />
              ) : (
                <RevokeControl workspaceId={workspaceId} invitation={invitation} />
              ),
          },
        ]}
        rows={invitations}
        rowKey={(invitation) => invitation.id}
        empty={emptyList('invitations')}
        className="data-table--nowrap"
      />
      <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
    </ListBody>
  </ListFrame>
);

export default PendingInvitations;
