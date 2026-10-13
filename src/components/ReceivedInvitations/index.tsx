import type { ReactElement } from 'react';
import StackTable from '../DataTable';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import { workspaceRoleLabel } from '../UserDetail/roles';
import { inUtc } from '../../lib/utc';
import AcceptControl from './accept-control';
import type { ReceivedInvitationsProps } from './types';

// The coven invitations addressed to the signed-in account, on the /coven
// landing (M10.32): coven, role, who sent it and what they wrote, expiry, with
// Accept on each. The page reads them through a service filtered to the
// session's own verified address; nothing here decides who may see a row
// (claude-docs/components/received-invitations.md).

const ReceivedInvitations = ({
  invitations,
  previousHref,
  nextHref,
  position,
}: ReceivedInvitationsProps): ReactElement => (
  <section className="received-invitations" aria-label="Your Invitations">
    <ListFrame>
      <ListBody>
        <StackTable
          aria-label="Your Invitations"
          columns={[
            {
              heading: 'Coven',
              cell: (invitation) => (
                <>
                  <strong>{invitation.covenName}</strong>
                  {invitation.inviterName && <small> from {invitation.inviterName}</small>}
                  {invitation.note && <small>{invitation.note}</small>}
                </>
              ),
            },
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
              heading: 'Accept',
              action: 'foot',
              cell: (invitation) => <AcceptControl invitation={invitation} />,
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

export default ReceivedInvitations;
