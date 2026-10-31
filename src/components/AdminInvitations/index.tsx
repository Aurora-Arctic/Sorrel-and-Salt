'use client';

import Link from 'next/link';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import StackTable from '../DataTable';
import { emptyList, noMatchText } from '../../lib/text';
import { inUtc } from '../../lib/utc';
import ConfirmedAction from '../UserList/confirmed-action';
import LockedControl from '../UserList/locked-control';
import { roleLabel } from '../UserList/roles';
import ListFrame, { ListBody } from '../ListFrame';
import { useOpenModalClick } from '../Modal';
import Notice from '../Notice';
import Pager from '../Pager';
import AdminInvitationsFilter from './filter';
import { invitationsHref } from './href';
import InviteForm, { INVITE_TITLE } from './invite-form';
import type {
  RevokeInvitationProps,
  AdminInvitationsFilter as Filter,
  AdminInvitationsProps,
  InviteAdminProps,
} from './types';
import './index.scss';

// The People page's Invitations tab, `/admin/invitations`: a filter, a page of pending invitations
// (address, site role, reason, expiry, Revoke), the pager, and the invite form `?invite` opens. While
// admin changes are paused both are locked for any admin but the primary (claude-docs/components/admin-invitations.md).

/** No filter: the whole pending list. */
const NO_FILTER: Filter = { email: '', expiringSoon: false };

/**
 * The empty list, naming the filters in use as the other admin lists do, so an
 * admin sees what to change: "No invitations match “fern” and Expires in 24 Hrs.
 * Change or clear the filter to see more."
 */
function emptyText({ email, expiringSoon }: Filter): string {
  const filters = [email && `“${email}”`, expiringSoon && 'Expires in 24 Hrs'].filter(
    (filter): filter is string => Boolean(filter),
  );
  return noMatchText('invitations', filters, emptyList('admin invitations'));
}

const RevokeAdminInvitationDocument = graphql(`
  mutation RevokeAdminInvitation($id: ID!) {
    revokeAdminInvitation(id: $id) {
      id
    }
  }
`);

const Revoke = ({ invitation, locked }: RevokeInvitationProps): ReactElement => {
  const accessibleName = `Revoke the invitation to ${invitation.email}`;
  if (locked) {
    return (
      <LockedControl
        label="Revoke"
        accessibleName={accessibleName}
        className="btn btn--quiet btn--small"
        reason={locked}
      />
    );
  }
  return (
    <ConfirmedAction
      label="Revoke"
      accessibleName={accessibleName}
      openClass="btn btn--quiet btn--small"
      title="Revoke Invitation"
      question={
        <>
          Revoke the invitation to <strong>{invitation.email}</strong>? Its link will say it was
          withdrawn.
        </>
      }
      busy="Revoking"
      confirmClass="btn btn--destructive"
      announcement={`The invitation to ${invitation.email} is revoked.`}
      send={() => graphqlRequest(RevokeAdminInvitationDocument, { id: invitation.id })}
    />
  );
};

/**
 * New Invitation, the tab's action beside the heading: a link to `?invite`, which opens the form over the
 * list, or locked with the pause as its reason. A link rather than a button since the heading and the list
 * render apart; it keeps the filter and page.
 */
export const InviteAdmin = ({
  locked,
  filter = NO_FILTER,
  cursor,
}: InviteAdminProps): ReactElement => {
  const href = invitationsHref(filter, cursor, true);
  const onClick = useOpenModalClick(href, { title: INVITE_TITLE });
  return locked ? (
    <LockedControl label={INVITE_TITLE} className="btn btn--solid" reason={locked} />
  ) : (
    <Link className="btn btn--solid" href={href} onClick={onClick}>
      {INVITE_TITLE}
    </Link>
  );
};

// A region named as a heading would name it, though it shows none: the page's heading and open tab say what
// it holds, and the name keeps the sent notice and rows findable as one. The sent notice is this component's
// state, set before the form closes, so it outlasts `?invite`.
const AdminInvitations = ({
  invitations,
  filter = NO_FILTER,
  cursor,
  previousHref,
  nextHref,
  position,
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
          {/* Each cell on one line, the table scrolling in its frame. */}
          <StackTable
            columns={[
              { heading: 'Email', cell: (invitation) => invitation.email },
              { heading: 'Role', cell: (invitation) => roleLabel(invitation.siteRole) },
              {
                heading: 'Reason',
                cell: (invitation) =>
                  invitation.note ?? <span className="admin-invitations__none">None given</span>,
              },
              {
                heading: 'Expires',
                cell: (invitation) => (
                  <time dateTime={invitation.expiresAt.toISOString()}>
                    {inUtc(invitation.expiresAt)}
                  </time>
                ),
              },
              // An action, so a card's foot with no label of its own.
              {
                heading: 'Revoke',
                action: 'foot',
                cell: (invitation) => <Revoke invitation={invitation} locked={locked} />,
              },
            ]}
            rows={invitations}
            rowKey={(invitation) => invitation.id}
            empty={emptyText(filter)}
            className="data-table--nowrap"
          />

          {/* Plain anchors, as the user list's: a full load runs the admin layout's guard again. */}
          <Pager previousHref={previousHref} nextHref={nextHref} position={position} />
        </ListBody>
      </ListFrame>
      {/* Rendered whatever the address opens, so a press opens it at once. */}
      <InviteForm
        open={inviting && !locked}
        onSent={setSent}
        closeHref={invitationsHref(filter, cursor)}
      />
    </section>
  );
};

export default AdminInvitations;
