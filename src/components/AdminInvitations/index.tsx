'use client';

import Link from 'next/link';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { stackCell, tableRole } from '../../lib/table-roles';
import { inUtc } from '../../lib/utc';
import ConfirmedAction from '../UserList/confirmed-action';
import LockedControl from '../UserList/locked-control';
import ListFrame, { ListBody } from '../ListFrame';
import Notice from '../Notice';
import AdminInvitationsFilter from './filter';
import { invitationsHref } from './href';
import InviteForm from './invite-form';
import type {
  AdminInvitationEntry,
  AdminInvitationsFilter as Filter,
  AdminInvitationsProps,
  InviteAdminProps,
} from './types';
import './index.scss';

// The People page's Invitations tab, `/admin/invitations` (MB.70; a tab of
// its own since MB.115): a filter by address and by expiry within 24 hours,
// the pending invitations it leaves, each with its address, reason and
// expiry, and Revoke, and the invite form `?invite` opens over them. Invite Admin is the tab's action, beside the page's heading. While
// admin changes are paused both are in view but locked for any admin but the
// primary one, with the pause as the reason, as the role controls are. The
// confirmation and the locked control are the user list's own, so the page
// asks one way, and each brings its own rules with it
// (claude-docs/components/admin-invitations.md).

/** The columns: each heading, and the label its cell carries as a card at phone width. */
const COLUMNS = { email: 'Email', reason: 'Reason', expires: 'Expires' } as const;
const REVOKE = 'Revoke';

/** No filter: the whole pending list. */
const NO_FILTER: Filter = { email: '', expiringSoon: false };

/** A list as prose, without the serial comma: "a", "a and b". */
function and(items: readonly string[]): string {
  return items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * The empty list, naming the filters in use as the other admin lists do
 * (MB.115), so an admin sees what to change: "No invitation matches “fern”
 * and Expires in 24 Hrs. Change or clear the filter to see more."
 */
function emptyText({ email, expiringSoon }: Filter): string {
  const filters = [email && `“${email}”`, expiringSoon && 'Expires in 24 Hrs'].filter(
    (filter): filter is string => Boolean(filter),
  );
  return filters.length
    ? `No invitation matches ${and(filters)}. Change or clear the filter to see more.`
    : 'No admin invitations are waiting.';
}

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

/**
 * Invite Admin, the Invitations tab's action beside the page's heading: a
 * link to `?invite`, which opens the form over the list, or locked with the
 * pause as its reason. A link rather than a button holding the form, since
 * the heading line and the list are rendered apart (MB.115). It keeps the
 * tab's filter, as a value page's Add does.
 */
export const InviteAdmin = ({ locked, filter = NO_FILTER }: InviteAdminProps): ReactElement =>
  locked ? (
    <LockedControl label="Invite Admin" className="btn btn--solid" reason={locked} />
  ) : (
    <Link className="btn btn--solid" href={invitationsHref(filter, true)}>
      Invite Admin
    </Link>
  );

// A region named as a heading would name it, though it shows none: the page's
// heading and its open tab already say what it holds, and the name keeps the
// sent notice and the rows findable as one. The sent notice is this
// component's state, set by the form before it closes, so it outlasts the
// form's `?invite` and names the address without carrying it in one.
const AdminInvitations = ({
  invitations,
  filter = NO_FILTER,
  locked,
  inviting = false,
}: AdminInvitationsProps): ReactElement => {
  const [sent, setSent] = useState<string>();
  // A form opened again clears the last notice, as a fresh form starts empty.
  const [wasInviting, setWasInviting] = useState(inviting);
  if (inviting !== wasInviting) {
    setWasInviting(inviting);
    if (inviting) setSent(undefined);
  }
  return (
    <section className="admin-invitations" aria-label="Admin Invitations">
      {sent && (
        <Notice kind="success" className="admin-invitations__sent">
          Invitation sent to {sent}.
        </Notice>
      )}
      <ListFrame>
        {/* Keyed by the filter shown, so another one starts the form again from it. */}
        <AdminInvitationsFilter key={`${filter.email}\n${filter.expiringSoon}`} filter={filter} />
        <ListBody>
          {invitations.length === 0 ? (
            <p>{emptyText(filter)}</p>
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
                        {invitation.note ?? (
                          <span className="admin-invitations__none">None given</span>
                        )}
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
        </ListBody>
      </ListFrame>
      {inviting && !locked && <InviteForm onSent={setSent} closeHref={invitationsHref(filter)} />}
    </section>
  );
};

export default AdminInvitations;
