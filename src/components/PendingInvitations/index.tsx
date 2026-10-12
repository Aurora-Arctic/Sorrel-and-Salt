import type { ReactElement } from 'react';
import StackTable from '../DataTable';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import { workspaceRoleLabel } from '../UserDetail/roles';
import { inUtc } from '../../lib/utc';
import RevokeControl from './revoke-control';
import type { PendingInvitationsProps } from './types';

// The invitations an owner has sent and nobody has answered, under the
// members roll (M7.6): address, role and expiry, newest first, with Revoke on
// each and its own pager. The page draws it for owners only and reads it
// through the services that check `member: invite`; nothing here decides who
// may see it (claude-docs/components/pending-invitations.md).

const PendingInvitations = ({
  workspaceId,
  invitations,
  previousHref,
  nextHref,
  position,
}: PendingInvitationsProps): ReactElement => (
  <section className="pending-invitations" aria-label="Pending Invitations">
    <ListFrame>
      <ListBody>
        <StackTable
          aria-label="Pending Invitations"
          columns={[
            { heading: 'Email', cell: (invitation) => invitation.email },
            { heading: 'Role', cell: (invitation) => workspaceRoleLabel(invitation.role) },
            {
              heading: 'Expires',
              cell: (invitation) => (
                <time dateTime={invitation.expiresAt.toISOString()}>
                  {inUtc(invitation.expiresAt)}
                </time>
              ),
            },
            {
              heading: 'Revoke',
              action: 'foot',
              cell: (invitation) => (
                <RevokeControl workspaceId={workspaceId} invitation={invitation} />
              ),
            },
          ]}
          rows={invitations}
          rowKey={(invitation) => invitation.id}
          empty="No invitations are waiting."
          className="data-table--nowrap"
        />
        <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
      </ListBody>
    </ListFrame>
  </section>
);

export default PendingInvitations;
