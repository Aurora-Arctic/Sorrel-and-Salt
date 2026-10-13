import type { ReactElement } from 'react';
import StackTable from '../DataTable';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import { workspaceRoleLabel } from '../UserDetail/roles';
import { inUtc } from '../../lib/utc';
import AcceptControl from './accept-control';
import type { ReceivedInvitationsProps } from './types';
import './index.scss';

// The coven invitations addressed to the signed-in account, in the account
// page's Invitations section (M10.32): coven, role, who sent it and what they
// wrote, expiry, with Accept on each. No region of its own: the page's
// section is the region, named by its heading. The page reads them through a service filtered to the
// session's own verified address; nothing here decides who may see a row
// (claude-docs/components/received-invitations.md).

const ReceivedInvitations = ({
  invitations,
  previousHref,
  nextHref,
  position,
}: ReceivedInvitationsProps): ReactElement => (
  <div className="received-invitations">
    <ListFrame>
      <ListBody>
        <StackTable
          aria-label="Your Invitations"
          columns={[
            {
              heading: 'Coven',
              className: 'received-invitations__coven',
              cell: (invitation) => (
                <>
                  <strong>{invitation.covenName}</strong>
                  {invitation.inviterName && <small> from {invitation.inviterName}</small>}
                  {invitation.note && (
                    <small className="received-invitations__note">{invitation.note}</small>
                  )}
                </>
              ),
            },
            {
              heading: 'Role',
              className: 'received-invitations__role',
              cell: (invitation) => workspaceRoleLabel(invitation.role),
            },
            {
              heading: 'Expires',
              className: 'received-invitations__expires',
              cell: (invitation) => (
                <time dateTime={invitation.expiresAt.toISOString()}>
                  {inUtc(invitation.expiresAt)}
                </time>
              ),
            },
            {
              heading: 'Accept',
              // At a card's top right, beside the coven (the owner's call, M10.32).
              action: 'corner',
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
  </div>
);

export default ReceivedInvitations;
