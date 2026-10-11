'use client';

import { type ReactElement, useId } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { stackCell, tableRole } from '../../lib/table-roles';
import { inUtc } from '../../lib/utc';
import ConfirmedAction from '../UserList/confirmed-action';
import LockedControl from '../UserList/locked-control';
import InviteForm from './invite-form';
import type { AdminInvitationEntry, AdminInvitationsProps } from './types';
import './index.scss';

// `/admin/users`' admin invitations (MB.70): Invite Admin, and the pending
// invitations, each with its address, reason and expiry, and Revoke. While
// admin changes are paused both are in view but locked for any admin but the
// primary one, with the pause as the reason, as the role controls are. The
// confirmation and the locked control are the user list's own, so the page
// asks one way, and each brings its own rules with it
// (claude-docs/components/admin-invitations.md).

/** The columns: each heading, and the label its cell carries as a card at phone width. */
const COLUMNS = { email: 'Email', reason: 'Reason', expires: 'Expires' } as const;
const REVOKE = 'Revoke';

const RevokeAdminInvitationDocument = graphql(`
  mutation RevokeAdminInvitation($id: ID!) {
    revokeAdminInvitation(id: $id) {
      id
    }
  }
`);

const Revoke = ({
  invitation,
  locked,
}: {
  invitation: AdminInvitationEntry;
  locked?: string;
}): ReactElement => {
  const accessibleName = `Revoke the invitation to ${invitation.email}`;
  if (locked) {
    return (
      <LockedControl
        label="Revoke"
        accessibleName={accessibleName}
        className="btn btn--small btn--destructive"
        reason={locked}
      />
    );
  }
  return (
    <ConfirmedAction
      label="Revoke"
      accessibleName={accessibleName}
      openClass="btn btn--small btn--destructive"
      title="Revoke Invitation"
      question={
        <>
          Revoke the invitation to <strong>{invitation.email}</strong>? Its link will say it was
          revoked.
        </>
      }
      busy="Revoking"
      confirmClass="btn btn--destructive"
      send={() => graphqlRequest(RevokeAdminInvitationDocument, { id: invitation.id })}
    />
  );
};

const AdminInvitations = ({ invitations, locked }: AdminInvitationsProps): ReactElement => {
  const headingId = useId();
  return (
    <section className="admin-invitations" aria-labelledby={headingId}>
      <div className="admin-invitations__header">
        <h2 id={headingId}>Admin Invitations</h2>
        {locked ? (
          <LockedControl label="Invite Admin" className="btn btn--solid" reason={locked} />
        ) : (
          <InviteForm />
        )}
      </div>
      {invitations.length === 0 ? (
        <p className="admin-invitations__empty">No admin invitations are waiting.</p>
      ) : (
        <div className="data-table-frame">
          <table className="data-table data-table--stack" {...tableRole('table')}>
            <thead {...tableRole('rowgroup')}>
              <tr {...tableRole('row')}>
                {[...Object.values(COLUMNS), REVOKE].map((heading) => (
                  <th key={heading} scope="col" {...tableRole('columnheader')}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody {...tableRole('rowgroup')}>
              {invitations.map((invitation) => (
                <tr key={invitation.id} {...tableRole('row')}>
                  <td {...stackCell(COLUMNS.email)}>{invitation.email}</td>
                  <td {...stackCell(COLUMNS.reason)}>
                    {invitation.note ?? <span className="admin-invitations__none">None given</span>}
                  </td>
                  <td {...stackCell(COLUMNS.expires)}>
                    <time dateTime={invitation.expiresAt.toISOString()}>
                      {inUtc(invitation.expiresAt)}
                    </time>
                  </td>
                  {/* An action, so a card's foot with no label of its own. */}
                  <td {...stackCell('')}>
                    <Revoke invitation={invitation} locked={locked} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default AdminInvitations;
