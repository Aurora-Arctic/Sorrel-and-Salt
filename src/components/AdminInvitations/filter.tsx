'use client';

import { type ReactElement, useId, useState } from 'react';
import { FieldShell, SwitchField, fieldDescription } from '../Field';
import FilterForm from '../FilterForm';
import { invitationsHref } from './href';
import type { AdminInvitationsFilterProps } from './types';

// The Invitations tab's filter (MB.115, on the owner's ask: "search the
// Invitations by email and expires in 24 hrs"), on the shared FilterForm as
// the user list's is: Filter offered only when the fields differ from the
// filter the page shows, and Clear after it. A full load, as the user
// list's, to agree with the pager's plain anchors, which run the admin
// layout's guard again; it names no cursor, so it opens the first page.
// Before hydration the form submits natively, the email as `email=`
// and Expires in 24 Hrs, a native checkbox, as `expiring=`, which the page
// reads the same as the bare flag. The list keys this by the filter shown,
// so a page showing another starts it again from that one.
const AdminInvitationsFilter = ({ filter }: AdminInvitationsFilterProps): ReactElement => {
  const email = fieldDescription({ id: `${useId()}-email` });
  const [draftEmail, setDraftEmail] = useState(filter.email);
  const [draftSoon, setDraftSoon] = useState(filter.expiringSoon);
  const changed = draftEmail.trim() !== filter.email || draftSoon !== filter.expiringSoon;

  return (
    <FilterForm
      label="Filter Invitations"
      action="/admin/invitations"
      href={() => invitationsHref({ email: draftEmail.trim(), expiringSoon: draftSoon })}
      disabled={!changed}
      shown={[filter.email, filter.expiringSoon]}
      draft={[draftEmail, draftSoon]}
      onClear={() => {
        setDraftEmail('');
        setDraftSoon(false);
      }}
      navigation="full"
    >
      <FieldShell label="Email" {...email}>
        <input
          id={email.controlId}
          className="input"
          type="search"
          name="email"
          placeholder="Search emails"
          value={draftEmail}
          onChange={(event) => setDraftEmail(event.target.value)}
        />
      </FieldShell>
      <SwitchField
        label="Expires in 24 Hrs"
        name="expiring"
        value=""
        checked={draftSoon}
        onChange={setDraftSoon}
      />
    </FilterForm>
  );
};

export default AdminInvitationsFilter;
