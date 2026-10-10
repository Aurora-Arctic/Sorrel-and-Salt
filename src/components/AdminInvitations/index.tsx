'use client';

import { type ReactElement, useId } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { inUtc } from '../../lib/utc';
import ConfirmedAction from '../UserList/confirmed-action';
import LockedControl from '../UserList/locked-control';
import InviteForm from './invite-form';
import type { AdminInvitationEntry, AdminInvitationsProps } from './types';
// The locked control's tip and the confirmation's spacing are the user list's.
import '../UserList/index.scss';
import './index.scss';

// `/admin/users`' admin invitations (MB.70): Invite Admin, and the pending
// invitations, each with its address, reason and expiry, and Revoke. While
// admin changes are paused both are in view but locked for any admin but the
// primary one, with the pause as the reason, as the role controls are. The
// confirmation and the locked control are the user list's own, so the page
// asks one way (claude-docs/components/admin-invitations.md).

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
          Withdraw the invitation to <strong>{invitation.email}</strong>? Its link will say it was
          withdrawn.
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
        <p className="admin-invitations__empty">No invitations are waiting.</p>
      ) : (
        <div className="data-table-frame">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Reason</th>
                <th scope="col">Expires</th>
                <th scope="col">Revoke</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td>{invitation.email}</td>
                  <td>
                    {invitation.note ?? <span className="admin-invitations__none">None given</span>}
                  </td>
                  <td>
                    <time dateTime={invitation.expiresAt.toISOString()}>
                      {inUtc(invitation.expiresAt)}
                    </time>
                  </td>
                  <td>
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
