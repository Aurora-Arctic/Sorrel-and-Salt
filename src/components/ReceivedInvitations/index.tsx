import type { ReactElement } from 'react';
import StackTable from '../DataTable';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import { workspaceRoleLabel } from '../UserDetail/roles';
import { emptyList } from '../../lib/text';
import { inUtc } from '../../lib/utc';
import AcceptControl from './accept-control';
import DeclineControl from './decline-control';
import type { ReceivedInvitationsProps } from './types';
import './index.scss';

// The coven invitations addressed to the signed-in account, in the account page's Invitations
// section, with Accept and Decline on each. The service filters to the session's verified address;
// nothing here decides who may see a row (claude-docs/components/received-invitations.md).

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
              heading: 'Answer',
              // At a card's top right, beside the coven.
              action: 'corner',
              cell: (invitation) => (
                <div className="received-invitations__answer">
                  <AcceptControl invitation={invitation} />
                  <DeclineControl invitation={invitation} />
                </div>
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
  </div>
);

export default ReceivedInvitations;
